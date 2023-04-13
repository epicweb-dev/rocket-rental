import * as Popover from '@radix-ui/react-popover'
import { json, redirect, type DataFunctionArgs } from '@remix-run/node'
import {
	Form,
	Link,
	useLoaderData,
	useSearchParams,
	useSubmit,
} from '@remix-run/react'
import { useCallback, useEffect, useState } from 'react'
import { z } from 'zod'
import { ShipCard } from '~/components/ship-card'
import { BrandCombobox } from '~/routes/resources+/brand-combobox'
import { CityCombobox } from '~/routes/resources+/city-combobox'
import { HostCombobox } from '~/routes/resources+/host-combobox'
import { ModelCombobox } from '~/routes/resources+/model-combobox'
import { StarportCombobox } from '~/routes/resources+/starport-combobox'
import { db, interpolateArray, prisma } from '~/utils/db.server'
import { CheckboxField, preprocessSearchParams } from '~/utils/forms'
import { getClosestStarports, getDistanceCalculation } from '~/utils/geo.server'
import { getImgSrc, getUserImgSrc, typedBoolean } from '~/utils/misc'
import { addParamToSet, unappend } from '~/utils/search-params'

const MAX_RESULTS = 50

const SearchParamsSchema = z.object({
	starportId: z.array(z.string()).default([]),
	cityId: z.array(z.string()).default([]),
	brandId: z.array(z.string()).default([]),
	modelId: z.array(z.string()).default([]),
	hostId: z.array(z.string()).default([]),
	capacityMin: z.coerce.number().positive().optional(),
	capacityMax: z.coerce.number().positive().optional(),
	dailyChargeMin: z.coerce.number().positive().optional(),
	dailyChargeMax: z.coerce.number().positive().optional(),
	hostRatingMin: z.coerce.number().min(0).max(5).optional(),
	shipRatingMin: z.coerce.number().min(0).max(5).optional(),
	availabilityStartDate: z
		.string()
		.refine(
			v => /\d{4}-\d{2}-\d{2}/.test(v),
			val => ({ message: `Invalid date: ${val}` }),
		)
		.optional(),
	availabilityEndDate: z
		.string()
		.refine(
			v => /\d{4}-\d{2}-\d{2}/.test(v),
			val => ({ message: `Invalid date: ${val}` }),
		)
		.optional(),
})

function ensureNoEmptySearchParams(request: Request) {
	const searchParams = new URL(request.url).searchParams
	const newSearchParams = new URLSearchParams(searchParams)
	let hasEmptyParam = false
	for (const [key, value] of searchParams) {
		if (value === '') {
			newSearchParams.delete(key)
			hasEmptyParam = true
		}
	}
	if (hasEmptyParam) {
		throw redirect(`/search?${newSearchParams.toString()}`)
	}
}

export async function loader({ request }: DataFunctionArgs) {
	ensureNoEmptySearchParams(request)
	const data = preprocessSearchParams(request, SearchParamsSchema)
	const searchParameters = SearchParamsSchema.parse(data)
	const { starportId, cityId, brandId, modelId, hostId } = searchParameters

	const ships = searchShips(searchParameters)

	const cities = await prisma.city.findMany({
		where: { id: { in: cityId } },
		select: { id: true, name: true, country: true },
	})

	const models = await prisma.shipModel.findMany({
		where: {
			id: { in: [...new Set(ships.map(ship => ship.modelId)), ...modelId] },
		},
		select: { id: true, name: true, imageId: true, brandId: true },
	})
	const brands = await prisma.shipBrand.findMany({
		where: {
			id: {
				in: [...new Set(ships.map(ship => ship.brandId)), ...brandId],
			},
		},
		select: { id: true, name: true, imageId: true },
	})
	const hosts = await prisma.host.findMany({
		where: {
			userId: { in: [...new Set(ships.map(ship => ship.hostId)), ...hostId] },
		},
		select: {
			user: { select: { id: true, username: true, name: true, imageId: true } },
		},
	})
	const starports = await prisma.starport.findMany({
		where: {
			id: {
				in: [...new Set(ships.map(ship => ship.starportId)), ...starportId],
			},
		},
		select: { id: true, name: true, imageId: true },
	})

	return json({ ships, brands, models, hosts, starports, cities })
}

const SearchShipsResult = z.array(
	z.object({
		id: z.string(),
		modelId: z.string(),
		hostId: z.string(),
		starportId: z.string(),
		brandId: z.string(),
		imageId: z.string(),
		name: z.string(),
		dailyCharge: z.number().positive(),
		capacity: z.number().positive(),
		hostAvgRating: z.number().min(0).max(5).nullable(),
		shipAvgRating: z.number().min(0).max(5).nullable(),
	}),
)

function searchShips({
	cityId,
	starportId,
	hostId,
	modelId,
	brandId,
	dailyChargeMin,
	dailyChargeMax,
	capacityMin,
	capacityMax,
	shipRatingMin,
	hostRatingMin,
	availabilityStartDate,
	availabilityEndDate,
}: z.infer<typeof SearchParamsSchema>) {
	const cityIdInter = interpolateArray(cityId, 'cid')
	const hostIdInter = interpolateArray(hostId, 'hid')
	const starportIdInter = interpolateArray(starportId, 'spid')
	const modelIdInter = interpolateArray(modelId, 'mid')
	const brandIdInter = interpolateArray(brandId, 'brid')

	const hostRatingSubqueryWhereClauses = [
		hostId.length ? `h.userId IN (${hostIdInter.query})` : null,
		starportId.length ? `ship.starportId IN (${starportIdInter.query})` : null,
		modelId.length ? `ship.modelId IN (${modelIdInter.query})` : null,
		brandId.length ? `m.brandId IN (${brandIdInter.query})` : null,
		typeof dailyChargeMin === 'number'
			? `ship.dailyCharge >= ${dailyChargeMin}`
			: null,
		typeof dailyChargeMax === 'number'
			? `ship.dailyCharge <= ${dailyChargeMax}`
			: null,
		typeof capacityMin === 'number' ? `ship.capacity >= ${capacityMin}` : null,
		typeof capacityMax === 'number' ? `ship.capacity <= ${capacityMax}` : null,
	]
		.filter(typedBoolean)
		.join(' AND ')

	const hostRatingSubquery = /* sql */ `
		SELECT h.userId, AVG(hr.rating) AS avgRating
		FROM Host h
		INNER JOIN HostReview hr ON hr.subjectId = h.userId
		${
			starportId.length ||
			typeof dailyChargeMin === 'number' ||
			typeof dailyChargeMax === 'number' ||
			typeof capacityMin === 'number' ||
			typeof capacityMax === 'number'
				? 'INNER JOIN Ship ship ON ship.hostId = h.userId'
				: ''
		}
		${
			modelId.length || brandId.length
				? 'INNER JOIN ShipModel m ON m.id = ship.modelId'
				: ''
		}
		${
			hostRatingSubqueryWhereClauses
				? `WHERE ${hostRatingSubqueryWhereClauses}`
				: ''
		}
		GROUP BY h.userId
	`

	const shipRatingSubqueryWhereClauses = [
		starportId.length ? `ship.starportId IN (${starportIdInter.query})` : null,
		hostId.length ? `ship.hostId IN (${hostIdInter.query})` : null,
		modelId.length ? `ship.modelId IN (${modelIdInter.query})` : null,
		brandId.length ? `m.brandId IN (${brandIdInter.query})` : null,
		typeof capacityMin === 'number' ? `ship.capacity >= ${capacityMin}` : null,
		typeof capacityMax === 'number' ? `ship.capacity <= ${capacityMax}` : null,
	]
		.filter(typedBoolean)
		.join(' AND ')

	const shipRatingSubquery = /* sql */ `
		SELECT ship.id, AVG(sr.rating) AS avgRating
		FROM Ship ship
		INNER JOIN ShipReview sr ON sr.subjectId = ship.id
		${starportId.length ? 'INNER JOIN Starport sp ON sp.id = ship.starportId' : ''}
		${hostId.length ? 'INNER JOIN Host h ON h.userId = ship.hostId' : ''}
		${
			modelId.length || brandId.length
				? 'INNER JOIN ShipModel m ON m.id = ship.modelId'
				: ''
		}
		${
			shipRatingSubqueryWhereClauses
				? `WHERE ${shipRatingSubqueryWhereClauses}`
				: ''
		}
		GROUP BY ship.id
	`

	const whereClauses = [
		typeof dailyChargeMin === 'number'
			? 'ship.dailyCharge >= @dailyChargeMin'
			: null,
		typeof dailyChargeMax === 'number'
			? 'ship.dailyCharge <= @dailyChargeMax'
			: null,
		typeof capacityMin === 'number' ? `ship.capacity >= ${capacityMin}` : null,
		typeof capacityMax === 'number' ? `ship.capacity <= ${capacityMax}` : null,
		typeof hostRatingMin === 'number' && hostRatingMin > 0
			? 'hostAvgRating >= @hostRatingMin'
			: null,
		typeof shipRatingMin === 'number' && shipRatingMin > 0
			? 'shipAvgRating >= @shipRatingMin'
			: null,
		starportId.length ? `ship.starportId IN (${starportIdInter.query})` : null,
		hostId.length ? `ship.hostId IN (${hostIdInter.query})` : null,
		modelId.length ? `ship.modelId IN (${modelIdInter.query})` : null,
		brandId.length ? `m.brandId IN (${brandIdInter.query})` : null,
		cityId.length ? `closestStarport.id = ship.starportId` : null,
		availabilityStartDate || availabilityEndDate
			? /* sql */ `
			NOT EXISTS (
				SELECT 1
				FROM Booking
				WHERE Booking.shipId = ship.id
						AND Booking.endDate > @availabilityStartDate
						AND Booking.startDate < @availabilityEndDate
			)
			`
			: null,
	]
		.filter(typedBoolean)
		.join(' AND ')

	const distanceCalculation = getDistanceCalculation({
		to: { lat: 'city.latitude', long: 'city.longitude' },
		from: { lat: 'starport.latitude', long: 'starport.longitude' },
	})

	const closestStarportSubquery = /* sql */ `
		SELECT
		starport.id,
		${distanceCalculation} AS distance
		FROM starport
		JOIN city
		ON city.id IN (${cityIdInter.query})
		ORDER BY distance ASC
		LIMIT @cityCount
`

	const query = /* sql */ `
		SELECT
			ship.id,
			ship.modelId,
			ship.hostId,
			ship.starportId,
			m.brandId,
			ship.imageId,
			ship.name,
			ship.dailyCharge,
			ship.capacity,
			(
				SELECT avgRating
				FROM (${hostRatingSubquery}) AS hostRatings
				WHERE hostRatings.userId = ship.hostId
			) as hostAvgRating,
			(
				SELECT avgRating
				FROM (${shipRatingSubquery}) AS shipRatings
				WHERE shipRatings.id = ship.id
			) as shipAvgRating

		FROM Ship ship

		INNER JOIN ShipModel m ON m.id = ship.modelId
		${
			cityId.length
				? `INNER JOIN (${closestStarportSubquery}) AS closestStarport ON closestStarport.id = ship.starportId`
				: ''
		}

		${whereClauses ? `WHERE ${whereClauses}` : ''}

		LIMIT @limit;
	`

	const preparedStatement = db.prepare(query)

	const rawResults = preparedStatement.all({
		limit: MAX_RESULTS,
		cityCount: cityId.length,
		hostRatingMin,
		shipRatingMin,
		dailyChargeMin,
		dailyChargeMax,
		availabilityStartDate,
		availabilityEndDate,
		...cityIdInter.interpolations,
		...starportIdInter.interpolations,
		...hostIdInter.interpolations,
		...modelIdInter.interpolations,
		...brandIdInter.interpolations,
	})

	const results = SearchShipsResult.parse(rawResults)

	return results
}

export async function action({ request }: DataFunctionArgs) {
	const formData = await request.formData()
	const intent = formData.get('intent')
	switch (intent) {
		case 'add-closest-starport': {
			const lat = formData.get('lat')
			const long = formData.get('long')
			const [closestStarport] = getClosestStarports({
				lat: Number(lat),
				long: Number(long),
				limit: 1,
			})
			const url = new URL(request.url)
			addParamToSet(url.searchParams, 'starportId', closestStarport.id)
			return redirect(`${url.pathname}?${url.searchParams.toString()}`)
		}
		default: {
			throw new Error(`Invalid intent: ${intent}`)
		}
	}
}

type Geo =
	| {
			state: 'resolved'
			lat: number
			long: number
	  }
	| {
			state: 'rejected'
			reason: string
	  }

function getGeo() {
	return new Promise<Geo>((res, rej) => {
		navigator.geolocation.getCurrentPosition(
			position => {
				const geo = {
					state: 'resolved',
					lat: position.coords.latitude,
					long: position.coords.longitude,
				} as const
				res(geo)
			},
			error => {
				const geo = {
					state: 'rejected',
					reason: error.message,
				} as const
				rej(geo)
			},
		)
	})
}

export default function ShipsRoute() {
	const data = useLoaderData<typeof loader>()
	const [searchParams, setSearchParams] = useSearchParams()
	const submit = useSubmit()
	const [geolocationEnabled, setGeolocationEnabled] = useState(false)
	const [geolocation, setGeolocation] = useState<{ state: 'pending' } | Geo>(
		() => {
			const defaultLat = Number(searchParams.get('lat'))
			const defaultLong = Number(searchParams.get('long'))
			if (defaultLat && defaultLong) {
				return { lat: defaultLat, long: defaultLong, state: 'resolved' }
			}
			return { state: 'pending' }
		},
	)

	const toggleGeolocation = useCallback(
		(enabled: boolean): Promise<typeof geolocation> => {
			setGeolocationEnabled(enabled)
			if (!enabled) {
				setGeolocation(g => (g.state === 'pending' ? g : { state: 'pending' }))
				return new Promise(res => res({ state: 'pending' }))
			}
			return getGeo().then(
				geo => {
					setGeolocation(geo)
					return geo
				},
				geo => {
					setGeolocation(geo)
					return geo
				},
			)
		},
		[],
	)

	// if we already have permission, then we can go ahead and get the location
	// and not worry about having to ask.
	useEffect(() => {
		navigator.permissions.query({ name: 'geolocation' }).then(result => {
			toggleGeolocation(result.state === 'granted')
		})
	}, [toggleGeolocation])

	return (
		<div className="container m-auto mt-12">
			<h1 className="text-h1">Rockets</h1>
			<CheckboxField
				labelProps={{ children: 'Enable Geolocation' }}
				buttonProps={{
					checked: geolocationEnabled,
					onCheckedChange: checkedState => {
						toggleGeolocation(checkedState === true).then(geo => {
							if (geo.state !== 'resolved') return

							submit(
								{
									intent: 'add-closest-starport',
									lat: geo.lat.toString(),
									long: geo.long.toString(),
								},
								{ method: 'POST' },
							)
						})
					},
				}}
			/>
			<div className="mx-auto flex items-center justify-center gap-4">
				<div className="flex flex-1 items-center justify-center rounded-full bg-night-500">
					<div className="flex-1">
						<StarportCombobox
							selectedItem={null}
							placeholder="Choose a starport"
							exclude={searchParams.getAll('starportId')}
							geolocation={
								geolocationEnabled && geolocation.state === 'resolved'
									? geolocation
									: null
							}
							onChange={selectedStarport => {
								if (selectedStarport) {
									const newSP = addParamToSet(
										new URLSearchParams(searchParams),
										'starportId',
										selectedStarport.id,
									)
									setSearchParams(newSP)
								}
							}}
						/>
					</div>
					<div className="flex-1">
						<CityCombobox
							selectedItem={null}
							placeholder="Choose a city"
							exclude={searchParams.getAll('cityId')}
							geolocation={
								geolocationEnabled && geolocation.state === 'resolved'
									? geolocation
									: null
							}
							onChange={selectedCity => {
								if (selectedCity) {
									const newSP = addParamToSet(
										new URLSearchParams(searchParams),
										'cityId',
										selectedCity.id,
									)
									setSearchParams(newSP)
								}
							}}
						/>
					</div>
					<div className="flex-1">
						<BrandCombobox
							selectedItem={null}
							placeholder="Choose a brand"
							exclude={searchParams.getAll('brandId')}
							onChange={selectedBrand => {
								if (selectedBrand) {
									const newSP = addParamToSet(
										new URLSearchParams(searchParams),
										'brandId',
										selectedBrand.id,
									)
									setSearchParams(newSP)
								}
							}}
						/>
					</div>
					<div className="flex-1">
						<ModelCombobox
							selectedItem={null}
							placeholder="Choose a model"
							exclude={searchParams.getAll('modelId')}
							onChange={selectedModel => {
								if (selectedModel) {
									const newSP = addParamToSet(
										new URLSearchParams(searchParams),
										'modelId',
										selectedModel.id,
									)
									setSearchParams(newSP)
								}
							}}
						/>
					</div>
					<div className="flex-1">
						<HostCombobox
							selectedItem={null}
							placeholder="Choose a host"
							exclude={searchParams.getAll('hostId')}
							onChange={selectedHost => {
								if (selectedHost) {
									const newSP = addParamToSet(
										new URLSearchParams(searchParams),
										'hostId',
										selectedHost.user.id,
									)
									setSearchParams(newSP)
								}
							}}
						/>
					</div>
				</div>

				<Form
					method="GET"
					onChange={event => {
						const newSP = new URLSearchParams(searchParams)
						const { target } = event
						if (target instanceof HTMLInputElement) {
							newSP.set(target.name, target.value)
							setSearchParams(newSP)
						} else {
							console.warn('Unexpected change event from target', target)
						}
					}}
				>
					<Popover.Root>
						<Popover.Trigger>
							<span className="flex h-[88px] w-[88px] items-center justify-center rounded-full bg-accent-purple">
								🌪
							</span>
						</Popover.Trigger>
						<Popover.Anchor />
						<Popover.Portal>
							<Popover.Content className="rounded-3xl bg-night-500 p-6">
								<Popover.Close>❌</Popover.Close>
								<div className="grid grid-cols-2 gap-6">
									<div className="col-span-2 rounded-2xl bg-night-600 p-6">
										<label>
											<span>Trip Start Date</span>
											<input
												type="date"
												name="availabilityStartDate"
												defaultValue={
													searchParams.get('availabilityStartDate') ?? ''
												}
											/>
										</label>
										<label>
											<span>Trip End Date</span>
											<input
												type="date"
												name="availabilityEndDate"
												defaultValue={
													searchParams.get('availabilityEndDate') ?? ''
												}
											/>
										</label>
									</div>
									<div className="rounded-2xl bg-night-600 p-6">
										<label>
											Capacity Min:{' '}
											<input
												name="capacityMin"
												type="number"
												min="1"
												max="15"
												className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
												defaultValue={searchParams.get('capacityMin') ?? ''}
											/>
										</label>
									</div>
									<div className="rounded-2xl bg-night-600 p-6">
										<label>
											Capacity Max:{' '}
											<input
												name="capacityMax"
												type="number"
												min="1"
												max="15"
												className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
												defaultValue={searchParams.get('capacityMax') ?? ''}
											/>
										</label>
									</div>
									<div className="rounded-2xl bg-night-600 p-6">
										<label>
											Daily Charge Min:{' '}
											<input
												name="dailyChargeMin"
												type="number"
												min="1"
												max="1000"
												className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
												defaultValue={searchParams.get('dailyChargeMin') ?? ''}
											/>
										</label>
									</div>
									<div className="rounded-2xl bg-night-600 p-6">
										<label>
											Daily Charge Max:{' '}
											<input
												name="dailyChargeMax"
												type="number"
												min="1"
												max="1000"
												className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
												defaultValue={searchParams.get('dailyChargeMax') ?? ''}
											/>
										</label>
									</div>
									<div className="rounded-2xl bg-night-600 p-6">
										<label>
											Minimum Ship Rating:{' '}
											<input
												name="shipRatingMin"
												type="number"
												min="0"
												max="5"
												className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
												defaultValue={searchParams.get('shipRatingMin') ?? ''}
											/>
										</label>
									</div>
									<div className="rounded-2xl bg-night-600 p-6">
										<label>
											Minimum Host Rating:{' '}
											<input
												name="hostRatingMin"
												type="number"
												min="0"
												max="5"
												className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
												defaultValue={searchParams.get('hostRatingMin') ?? ''}
											/>
										</label>
									</div>
								</div>
							</Popover.Content>
						</Popover.Portal>
					</Popover.Root>
				</Form>
			</div>
			<div className="mb-8 mt-16">
				<FilterItems />
			</div>

			{data.ships.length ? (
				<ul className="flex flex-wrap items-center justify-center gap-6">
					{data.ships.map(ship => {
						const model = data.models.find(m => m.id === ship.modelId) ?? {
							id: 'unknown',
							name: 'Unknown',
							brandId: 'unknown',
						}
						const brand = data.brands.find(b => b.id === model?.brandId) ?? {
							id: 'unknown',
							name: 'Unknown',
						}
						return (
							<li key={ship.id}>
								<ShipCard
									ship={ship}
									avgRating={ship.shipAvgRating}
									brand={brand}
									model={model}
									dailyChargeFormatted={ship.dailyCharge.toLocaleString(
										'en-US',
										{ style: 'currency', currency: 'USD' },
									)}
								/>
							</li>
						)
					})}
				</ul>
			) : (
				<p>No ships found</p>
			)}
		</div>
	)
}

function FilterItems() {
	const data = useLoaderData<typeof loader>()
	const [searchParams] = useSearchParams()
	const starports = searchParams.getAll('starportId')
	const cities = searchParams.getAll('cityId')
	const brands = searchParams.getAll('brandId')
	const models = searchParams.getAll('modelId')
	const hosts = searchParams.getAll('hostId')
	type FilterItem = { removePath: string; displayName: string } & (
		| { imageUrl: string; detailPath: string; altText: string }
		| { imageUrl?: never; detailPath?: never; altText?: never }
	)
	function makeRemovePath(key: string, value: string) {
		return `/search?${unappend(new URLSearchParams(searchParams), key, value)}`
	}
	const items: Array<FilterItem> = [
		...starports.map(id => {
			const starport = data.starports.find(s => id === s.id)
			if (!starport) {
				console.warn(`Starport ${id} not found`)
				return null
			}
			return {
				removePath: makeRemovePath('starportId', starport.id),
				displayName: starport.name,
				imageUrl: getImgSrc(starport.imageId),
				detailPath: `/starports/${starport.id}`,
				altText: starport.name,
			}
		}),
		...cities.map(id => {
			const city = data.cities.find(c => id === c.id)
			if (!city) {
				console.warn(`City ${id} not found`)
				return null
			}
			return {
				removePath: makeRemovePath('cityId', city.id),
				displayName: city.name,
			}
		}),
		...brands.map(id => {
			const brand = data.brands.find(b => id === b.id)
			if (!brand) {
				console.warn(`Brand ${id} not found`)
				return null
			}
			return {
				removePath: makeRemovePath('brandId', brand.id),
				displayName: brand.name,
				imageUrl: getImgSrc(brand.imageId),
				detailPath: `/brands/${brand.id}`,
				altText: brand.name,
			}
		}),
		...models.map(id => {
			const model = data.models.find(m => id === m.id)
			if (!model) {
				console.warn(`Model ${id} not found`)
				return null
			}
			return {
				removePath: makeRemovePath('modelId', model.id),
				displayName: model.name,
				imageUrl: getImgSrc(model.imageId),
				detailPath: `/models/${model.id}`,
				altText: model.name,
			}
		}),
		...hosts.map(id => {
			const host = data.hosts.find(h => id === h.user.id)
			if (!host) {
				console.warn(`Host ${id} not found`)
				return null
			}
			return {
				removePath: makeRemovePath('hostId', host.user.id),
				displayName: host.user.name ?? host.user.username,
				imageUrl: getUserImgSrc(host.user.imageId),
				detailPath: `/${host.user.id}`,
				altText: host.user.name,
			}
		}),
	].filter(typedBoolean)

	return (
		<ul className="flex gap-2">
			{items.map(item => {
				return (
					<li
						key={item.removePath}
						className="flex items-center gap-2 rounded-full border border-night-400 px-4 py-3"
					>
						{item.detailPath ? (
							<Link to={item.detailPath} className="flex items-center gap-2">
								{item.imageUrl ? (
									<img
										src={item.imageUrl}
										alt={item.altText}
										className="h-8 w-8 rounded-full"
									/>
								) : null}
								{item.displayName}
							</Link>
						) : (
							<span>{item.displayName}</span>
						)}
						<Link to={item.removePath}>❌</Link>
					</li>
				)
			})}
		</ul>
	)
}

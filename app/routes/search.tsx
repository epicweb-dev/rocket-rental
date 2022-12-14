import type { DataFunctionArgs } from '@remix-run/node'
import { redirect } from '@remix-run/node'
import { json } from '@remix-run/node'
import {
	Form,
	Link,
	useLoaderData,
	useSearchParams,
	useSubmit,
} from '@remix-run/react'
import { useCallback, useEffect, useState } from 'react'
import { db, interpolateArray, prisma } from '~/utils/db.server'
import { getClosestStarports } from '~/utils/geo.server'
import { typedBoolean } from '~/utils/misc'
import { z } from 'zod'
import { BrandCombobox } from './resources.brand-combobox'
import { CityCombobox } from './resources.city-combobox'
import { HostCombobox } from './resources.host-combobox'
import { ModelCombobox } from './resources.model-combobox'
import { StarportCombobox } from './resources.starport-combobox'

const MAX_RESULTS = 50

export async function loader({ request }: DataFunctionArgs) {
	const searchParams = new URL(request.url).searchParams
	const searchParamsEmpty = !searchParams.toString()
	if (searchParamsEmpty) {
		return json({
			ships: [],
			starports: [],
			models: [],
			brands: [],
			hosts: [],
			cities: [],
			shipAverageRatings: [],
			hostAverageRatings: [],
		})
	}

	const starportIds = searchParams.getAll('starportId')
	const cityIds = searchParams.getAll('cityId')
	const brandIds = searchParams.getAll('brandId')
	const modelIds = searchParams.getAll('modelId')
	const hostIds = searchParams.getAll('hostId')
	const {
		capacityMin,
		capacityMax,
		dailyChargeMin,
		dailyChargeMax,
		hostRatingMin,
		shipRatingMin,
		availabilityStartDate,
		availabilityEndDate,
	} = Object.fromEntries(searchParams)

	const cities = await prisma.city.findMany({
		where: { id: { in: cityIds } },
		select: {
			id: true,
			name: true,
			country: true,
			latitude: true,
			longitude: true,
		},
	})

	const ships = searchShips({
		cityIds,
		starportIds,
		brandIds,
		modelIds,
		hostIds,
		capacityMin: capacityMin ? Number(capacityMin) : undefined,
		capacityMax: capacityMax ? Number(capacityMax) : undefined,
		dailyChargeMin: dailyChargeMin ? Number(dailyChargeMin) : undefined,
		dailyChargeMax: dailyChargeMax ? Number(dailyChargeMax) : undefined,
		hostRatingMin: hostRatingMin ? Number(hostRatingMin) : undefined,
		shipRatingMin: shipRatingMin ? Number(shipRatingMin) : undefined,
		availabilityStartDate: availabilityStartDate
			? availabilityStartDate
			: undefined,
		availabilityEndDate: availabilityEndDate ? availabilityEndDate : undefined,
	})

	const models = await prisma.shipModel.findMany({
		where: {
			id: { in: [...new Set(ships.map(ship => ship.modelId)), ...modelIds] },
		},
		select: { id: true, name: true, imageUrl: true },
	})
	const brands = await prisma.shipBrand.findMany({
		where: {
			id: {
				in: [...new Set(ships.map(ship => ship.brandId)), ...brandIds],
			},
		},
		select: { id: true, name: true, imageUrl: true },
	})
	const hosts = await prisma.host.findMany({
		where: {
			userId: { in: [...new Set(ships.map(ship => ship.hostId)), ...hostIds] },
		},
		select: { user: { select: { id: true, name: true, imageUrl: true } } },
	})
	const starports = await prisma.starport.findMany({
		where: {
			id: {
				in: [...new Set(ships.map(ship => ship.starportId))],
			},
		},
		select: { id: true, name: true },
	})

	return json({
		ships,
		brands,
		models,
		hosts,
		starports,
		cities,
	})
}

const SearchShipsResult = z.array(
	z.object({
		id: z.string(),
		modelId: z.string(),
		hostId: z.string(),
		starportId: z.string(),
		brandId: z.string(),
		imageUrl: z.string().url(),
		name: z.string(),
		dailyCharge: z.number().positive(),
		capacity: z.number().positive(),
		hostAvgRating: z.number().min(0).max(5).nullable(),
		shipAvgRating: z.number().min(0).max(5).nullable(),
	}),
)

function searchShips({
	cityIds,
	starportIds,
	hostIds,
	modelIds,
	brandIds,
	dailyChargeMin,
	dailyChargeMax,
	capacityMin,
	capacityMax,
	shipRatingMin,
	hostRatingMin,
	availabilityStartDate,
	availabilityEndDate,
}: {
	cityIds: Array<string>
	starportIds: Array<string>
	hostIds: Array<string>
	modelIds: Array<string>
	brandIds: Array<string>
	dailyChargeMin?: number
	dailyChargeMax?: number
	capacityMin?: number
	capacityMax?: number
	shipRatingMin?: number
	hostRatingMin?: number
	availabilityStartDate?: string
	availabilityEndDate?: string
}) {
	const cityIdInter = interpolateArray(cityIds, 'cid')
	const hostIdInter = interpolateArray(hostIds, 'hid')
	const starportIdInter = interpolateArray(starportIds, 'spid')
	const modelIdInter = interpolateArray(modelIds, 'mid')
	const brandIdInter = interpolateArray(brandIds, 'brid')

	const hostRatingSubqueryWhereClauses = [
		hostIds.length ? `h.userId IN (${hostIdInter.query})` : null,
		starportIds.length ? `ship.starportId IN (${starportIdInter.query})` : null,
		modelIds.length ? `ship.modelId IN (${modelIdInter.query})` : null,
		brandIds.length ? `m.brandId IN (${brandIdInter.query})` : null,
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
INNER JOIN HostReview hr ON hr.hostId = h.userId
${
	starportIds.length ||
	typeof dailyChargeMin === 'number' ||
	typeof dailyChargeMax === 'number' ||
	typeof capacityMin === 'number' ||
	typeof capacityMax === 'number'
		? 'INNER JOIN Ship ship ON ship.hostId = h.userId'
		: ''
}
${
	modelIds.length || brandIds.length
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
		starportIds.length ? `ship.starportId IN (${starportIdInter.query})` : null,
		hostIds.length ? `ship.hostId IN (${hostIdInter.query})` : null,
		modelIds.length ? `ship.modelId IN (${modelIdInter.query})` : null,
		brandIds.length ? `m.brandId IN (${brandIdInter.query})` : null,
		typeof capacityMin === 'number' ? `ship.capacity >= ${capacityMin}` : null,
		typeof capacityMax === 'number' ? `ship.capacity <= ${capacityMax}` : null,
	]
		.filter(typedBoolean)
		.join(' AND ')

	const shipRatingSubquery = /* sql */ `
SELECT ship.id, AVG(sr.rating) AS avgRating
FROM Ship ship
INNER JOIN ShipReview sr ON sr.shipId = ship.id
${starportIds.length ? 'INNER JOIN Starport sp ON sp.id = ship.starportId' : ''}
${hostIds.length ? 'INNER JOIN Host h ON h.userId = ship.hostId' : ''}
${
	modelIds.length || brandIds.length
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
		starportIds.length ? `ship.starportId IN (${starportIdInter.query})` : null,
		hostIds.length ? `ship.hostId IN (${hostIdInter.query})` : null,
		modelIds.length ? `ship.modelId IN (${modelIdInter.query})` : null,
		brandIds.length ? `m.brandId IN (${brandIdInter.query})` : null,
		cityIds.length ? `closestStarport.id = ship.starportId` : null,
		/* sql */
		`
			NOT EXISTS (
				SELECT 1
				FROM Booking
				WHERE Booking.shipId = ship.id
						AND Booking.endDate > @availabilityStartDate
						AND Booking.startDate < @availabilityEndDate
			)
		`,
	]
		.filter(typedBoolean)
		.join(' AND ')

	const closestStarportSubquery = /* sql */ `
SELECT
starport.id,
acos(
	sin(city.latitude * PI()/180)
	* sin(starport.latitude * PI()/180)
	+ cos(city.latitude * PI()/180)
	* cos(starport.latitude * PI()/180)
	* cos((city.longitude - starport.longitude) * PI()/180)
)
* 180/PI() * 60
-- convert from nautical miles to miles
* 1.1515
AS distance
FROM starport
JOIN city
ON city.id IN (${cityIdInter.query})
ORDER BY distance ASC
LIMIT @cityCount
`

	const query =
		/* sql */
		`
SELECT
	ship.id,
	ship.modelId,
	ship.hostId,
	ship.starportId,
	m.brandId,
	ship.imageUrl,
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
	cityIds.length
		? `INNER JOIN (${closestStarportSubquery}) AS closestStarport ON closestStarport.id = ship.starportId`
		: ''
}

${whereClauses ? `WHERE ${whereClauses}` : ''}

LIMIT @limit
;
	`

	const preparedStatement = db.prepare(query)

	const rawResults = preparedStatement.all({
		limit: MAX_RESULTS,
		cityCount: cityIds.length,
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
				latitude: Number(lat),
				longitude: Number(long),
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

function addParamToSet(
	searchParams: URLSearchParams,
	key: string,
	value: string,
) {
	const values = searchParams.getAll(key)
	if (!values.includes(value)) {
		searchParams.append(key, value)
	}
	return searchParams
}

function unappend(searchParams: URLSearchParams, key: string, value: string) {
	const values = searchParams.getAll(key).filter(v => v !== value)
	searchParams.delete(key)
	for (const value of values) {
		searchParams.append(key, value)
	}
	return searchParams
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

	const toggleGeolocation = useCallback(function toggleGeolocation(
		enabled: boolean,
	): Promise<typeof geolocation> {
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
	[])

	// if we already have permission, then we can go ahead and get the location
	// and not worry about having to ask.
	useEffect(() => {
		navigator.permissions.query({ name: 'geolocation' }).then(result => {
			toggleGeolocation(result.state === 'granted')
		})
	}, [toggleGeolocation])

	return (
		<div>
			<h1>Search</h1>
			<label>
				<input
					type="checkbox"
					checked={geolocationEnabled}
					onChange={e => {
						toggleGeolocation(e.currentTarget.checked).then(geo => {
							if (geo.state !== 'resolved') return

							submit(
								{
									intent: 'add-closest-starport',
									lat: geo.lat.toString(),
									long: geo.long.toString(),
								},
								{ method: 'post' },
							)
						})
					}}
				/>{' '}
				Enable Geolocation
			</label>
			<StarportCombobox
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
			<ul>
				{searchParams
					.getAll('starportId')
					.map(id => {
						const starport = data.starports.find(s => id === s.id)
						if (!starport) {
							console.warn(`Starport ${id} not found`)
							return null
						}
						return starport
					})
					.filter(typedBoolean)
					.map(starport => {
						const newSP = unappend(
							new URLSearchParams(searchParams),
							'starportId',
							starport.id,
						)

						return (
							<li key={starport.id}>
								<Link to={`/search?${newSP}`}>{starport.name} ❌</Link>
							</li>
						)
					})}
			</ul>
			<CityCombobox
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
			<ul>
				{searchParams
					.getAll('cityId')
					.map(id => {
						const city = data.cities.find(c => id === c.id)
						if (!city) {
							console.warn(`City ${id} not found`)
							return null
						}
						return city
					})
					.filter(typedBoolean)
					.map(city => {
						const newSP = unappend(
							new URLSearchParams(searchParams),
							'cityId',
							city.id,
						)

						return (
							<li key={city.id}>
								<Link to={`/search?${newSP}`}>
									{city.name} ({city.country}) ❌
								</Link>
							</li>
						)
					})}
			</ul>
			<BrandCombobox
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
			<ul>
				{searchParams
					.getAll('brandId')
					.map(id => {
						const brand = data.brands.find(b => id === b.id)
						if (!brand) {
							console.warn(`Brand ${id} not found`)
							return null
						}
						return brand
					})
					.filter(typedBoolean)
					.map(brand => {
						const newSP = unappend(
							new URLSearchParams(searchParams),
							'brandId',
							brand.id,
						)

						return (
							<li key={brand.id}>
								<div className="flex items-center gap-2">
									<Link to={`/${brand.id}`} className="flex items-center gap-2">
										{brand.imageUrl ? (
											<img
												src={brand.imageUrl}
												alt={brand.name ?? 'Unnamed host'}
												className="h-8 w-8 rounded-full"
											/>
										) : null}
										{brand.name}
									</Link>
									<Link to={`/search?${newSP}`}>❌</Link>
								</div>
							</li>
						)
					})}
			</ul>
			<ModelCombobox
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
			<ul>
				{searchParams
					.getAll('modelId')
					.map(id => {
						const model = data.models.find(b => id === b.id)
						if (!model) {
							console.warn(`Model ${id} not found`)
							return null
						}
						return model
					})
					.filter(typedBoolean)
					.map(model => {
						const newSP = unappend(
							new URLSearchParams(searchParams),
							'modelId',
							model.id,
						)

						return (
							<li key={model.id}>
								<div className="flex items-center gap-2">
									<Link to={`/${model.id}`} className="flex items-center gap-2">
										{model.imageUrl ? (
											<img
												src={model.imageUrl}
												alt={model.name ?? 'Unnamed host'}
												className="h-8 w-8 rounded-full"
											/>
										) : null}
										{model.name}
									</Link>
									<Link to={`/search?${newSP}`}>❌</Link>
								</div>
							</li>
						)
					})}
			</ul>
			<HostCombobox
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
			<ul>
				{searchParams
					.getAll('hostId')
					.map(id => {
						const host = data.hosts.find(c => id === c.user.id)
						if (!host) {
							console.warn(`Host ${id} not found`)
							return null
						}
						return host
					})
					.filter(typedBoolean)
					.map(host => {
						const newSP = unappend(
							new URLSearchParams(searchParams),
							'hostId',
							host.user.id,
						)

						return (
							<li key={host.user.id}>
								<div className="flex items-center gap-2">
									<Link
										to={`/${host.user.id}`}
										className="flex items-center gap-2"
									>
										{host.user.imageUrl ? (
											<img
												src={host.user.imageUrl}
												alt={host.user.name ?? 'Unnamed host'}
												className="h-8 w-8 rounded-full"
											/>
										) : null}
										{host.user.name}
									</Link>
									<Link to={`/search?${newSP}`}>❌</Link>
								</div>
							</li>
						)
					})}
			</ul>
			<Form
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
				<div className="flex flex-wrap gap-6">
					<label>
						<span>Trip Start Date</span>
						<input
							type="date"
							name="startDate"
							defaultValue={searchParams.get('startDate') ?? ''}
						/>
					</label>
					<label>
						<span>Trip End Date</span>
						<input
							type="date"
							name="endDate"
							defaultValue={searchParams.get('endDate') ?? ''}
						/>
					</label>
					<label>
						Capacity Min:{' '}
						<input
							name="capacityMin"
							type="number"
							className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
							defaultValue={searchParams.get('capacityMin') ?? ''}
						/>
					</label>
					<label>
						Capacity Max:{' '}
						<input
							name="capacityMax"
							type="number"
							className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
							defaultValue={searchParams.get('capacityMax') ?? ''}
						/>
					</label>
					<label>
						Daily Charge Min:{' '}
						<input
							name="dailyChargeMin"
							type="number"
							className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
							defaultValue={searchParams.get('dailyChargeMin') ?? ''}
						/>
					</label>
					<label>
						Daily Charge Max:{' '}
						<input
							name="dailyChargeMax"
							type="number"
							className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
							defaultValue={searchParams.get('dailyChargeMax') ?? ''}
						/>
					</label>
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
					<button type="submit">Submit</button>
				</div>
			</Form>
			{data.ships.length ? (
				<>
					<ul>
						{data.ships.map(ship => (
							<li key={ship.id} className="p-6">
								<a
									href={`/ships/${ship.id}`}
									className="flex gap-4 bg-slate-400"
								>
									<img
										src={ship.imageUrl}
										alt=""
										className="inline aspect-square w-16 rounded-sm"
									/>
									<span>
										{ship.name} (
										{data.starports.find(s => s.id === ship.starportId)?.name})
									</span>
								</a>
							</li>
						))}
					</ul>
				</>
			) : (
				<p>No ships found</p>
			)}
		</div>
	)
}

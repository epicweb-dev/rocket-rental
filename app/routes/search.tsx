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
import { BrandCombobox } from './resources.brand-combobox'
import { CityCombobox } from './resources.city-combobox'
import { HostCombobox } from './resources.host-combobox'
import { StarportCombobox } from './resources.starport-combobox'

const MAX_RESULTS = 50

export async function loader({ request }: DataFunctionArgs) {
	const searchParams = new URL(request.url).searchParams
	const searchParamsEmpty = !searchParams.toString()
	if (searchParamsEmpty) {
		return json({
			ships: [],
			starports: [],
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
	const hostIds = searchParams.getAll('hostId')
	const capacityMin = searchParams.get('capacityMin')
	const capacityMax = searchParams.get('capacityMax')
	const dailyChargeMin = searchParams.get('dailyChargeMin')
	const dailyChargeMax = searchParams.get('dailyChargeMax')
	const hostRatingMin = searchParams.get('hostRatingMin')
	const shipRatingMin = searchParams.get('shipRatingMin')

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
	const starportsNearCities = cities.flatMap(c => {
		return getClosestStarports({
			latitude: c.latitude,
			longitude: c.longitude,
			limit: 1,
		})
	})

	const allStarportIds = [...starportIds, ...starportsNearCities.map(s => s.id)]

	// TODO: Why are we not getting any ships back.
	// I just finished adding host rating support and ships aren't coming back...

	let ships = await prisma.ship.findMany({
		where: {
			starportId: allStarportIds.length ? { in: allStarportIds } : undefined,
			brandId: brandIds.length ? { in: brandIds } : undefined,
			hostId: hostIds.length ? { in: hostIds } : undefined,
			dailyCharge:
				dailyChargeMin || dailyChargeMax
					? {
							gte: dailyChargeMin ? Number(dailyChargeMin) : undefined,
							lte: dailyChargeMax ? Number(dailyChargeMax) : undefined,
					  }
					: undefined,
			capacity:
				capacityMin || capacityMax
					? {
							gte: capacityMin ? Number(capacityMin) : undefined,
							lte: capacityMax ? Number(capacityMax) : undefined,
					  }
					: undefined,
			reviews: shipRatingMin
				? {
						some: {
							rating: {},
						},
				  }
				: undefined,
			host: hostRatingMin
				? {
						reviews: {
							some: {
								rating: {},
							},
						},
				  }
				: undefined,
		},
		select: {
			id: true,
			brandId: true,
			hostId: true,
			starportId: true,
			imageUrl: true,
			name: true,
		},
		take: MAX_RESULTS,
	})

	const shipAverageRatings = getShipAverageRatings({
		shipRatingMin: Number(shipRatingMin),
		include: ships.map(s => s.id),
	})
	if (shipRatingMin) {
		ships = ships.filter(s => shipAverageRatings.some(sr => sr.id === s.id))
	}

	const hostAverageRatings = getHostAverageRatings({
		hostRatingMin: Number(hostRatingMin),
		include: ships.map(s => s.hostId),
	})
	if (hostRatingMin) {
		ships = ships.filter(s => hostAverageRatings.some(hr => hr.id === s.hostId))
	}

	const brands = await prisma.shipBrand.findMany({
		where: {
			id: { in: [...new Set(ships.map(ship => ship.brandId)), ...brandIds] },
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
				in: [...new Set(ships.map(ship => ship.starportId)), ...allStarportIds],
			},
		},
		select: { id: true, name: true },
	})

	return json({
		ships,
		brands,
		hosts,
		starports,
		cities,
		shipAverageRatings,
		hostAverageRatings,
	})
}

function getHostAverageRatings({
	hostRatingMin,
	include,
}: {
	hostRatingMin: number
	include: Array<string>
}) {
	const shipInter = interpolateArray(include, 'include')
	const havingClause = [
		'avgRating NOT NULL',
		hostRatingMin ? 'avgRating >= @hostRatingMin' : null,
	]
		.filter(typedBoolean)
		.join(' AND ')

	const hostAverageRatings = db
		.prepare(
			/* sql */ `
SELECT s.id, AVG(hr.rating) AS avgRating
FROM Ship s
INNER JOIN Host h ON s.hostId = h.userId
INNER JOIN HostReview hr ON hr.hostId = h.userId
GROUP BY s.id
${havingClause ? `HAVING ${havingClause}` : ''}
LIMIT @limit
;`,
		)
		.all({ hostRatingMin, limit: MAX_RESULTS, ...shipInter.interpolations })

	assertAvgRating(hostAverageRatings)

	return hostAverageRatings
}

function getShipAverageRatings({
	shipRatingMin,
	include,
}: {
	shipRatingMin: number
	include: Array<string>
}) {
	const shipInter = interpolateArray(include, 'include')
	const havingClause = [
		'avgRating NOT NULL',
		shipRatingMin ? 'avgRating >= @shipRatingMin' : null,
	]
		.filter(typedBoolean)
		.join(' AND ')
	const shipAverageRatings = db
		.prepare(
			/* sql */ `
SELECT s.id, AVG(sr.rating) AS avgRating
FROM Ship s
LEFT JOIN ShipReview sr ON sr.shipId = s.id
WHERE s.id IN (${shipInter.query})
GROUP BY s.id
${havingClause ? `HAVING ${havingClause}` : ''}
LIMIT @limit
;
	`,
		)
		.all({
			shipRatingMin: shipRatingMin,
			limit: MAX_RESULTS,
			...shipInter.interpolations,
		})

	assertAvgRating(shipAverageRatings)

	return shipAverageRatings
}

function assertAvgRating(
	avgRating: any,
): asserts avgRating is Array<{ id: string; avgRating: number }> {
	if (!Array.isArray(avgRating)) {
		throw new Error('avgRating is not an array')
	}
	if (
		avgRating.some(
			r => typeof r.id !== 'string' || typeof r.avgRating !== 'number',
		)
	) {
		throw new Error(
			'avgRating is not an array of { id: string; avgRating: number }',
		)
	}
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
					const form = event.currentTarget
					requestAnimationFrame(() => submit(form))
				}}
			>
				<div className="flex flex-wrap gap-6">
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

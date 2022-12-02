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
import { useCallback, useEffect, useRef, useState } from 'react'
import { prisma } from '~/db.server'
import { getClosestStarports } from '~/utils/geo.server'
import { typedBoolean } from '~/utils/misc'
import { CityCombobox } from './resources.city-combobox'
import { StarportCombobox } from './resources.starport-combobox'

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
		})
	}

	const starportId = searchParams.getAll('starportId')
	const cityId = searchParams.getAll('cityId')
	const brandId = searchParams.getAll('brandId')
	const hostId = searchParams.getAll('hostId')
	const capacityMin = searchParams.get('capacityMin')
	const capacityMax = searchParams.get('capacityMax')
	const dailyChargeMin = searchParams.get('dailyChargeMin')
	const dailyChargeMax = searchParams.get('dailyChargeMax')

	const cities = await prisma.city.findMany({
		where: { id: { in: cityId } },
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
	const allStarportIds = [...starportId, ...starportsNearCities.map(s => s.id)]

	const ships = await prisma.ship.findMany({
		where: {
			starportId: allStarportIds.length ? { in: allStarportIds } : undefined,
			brandId: brandId.length ? { in: brandId } : undefined,
			hostId: hostId.length ? { in: hostId } : undefined,
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
		},
		select: {
			id: true,
			brandId: true,
			hostId: true,
			starportId: true,
			imageUrl: true,
			name: true,
		},
		take: 50,
	})
	const brands = await prisma.shipBrand.findMany({
		where: { id: { in: [...new Set(ships.map(ship => ship.brandId))] } },
		select: { id: true },
	})
	const hosts = await prisma.host.findMany({
		where: { userId: { in: [...new Set(ships.map(ship => ship.hostId))] } },
		select: { userId: true },
	})
	const starports = await prisma.starport.findMany({
		where: { id: { in: [...new Set(ships.map(ship => ship.starportId))] } },
		select: { id: true, name: true },
	})
	return json({ ships, brands, hosts, starports, cities })
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
	const formRef = useRef<HTMLFormElement>(null)
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
			<Form action="/search" ref={formRef}>
				<ul>
					{searchParams
						.getAll('starportId')
						.map(id => data.starports.find(s => id === s.id))
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
				<ul>
					{searchParams
						.getAll('cityId')
						.map(id => data.cities.find(s => id === s.id))
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
				<fieldset>
					<legend>Filters</legend>
				</fieldset>
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

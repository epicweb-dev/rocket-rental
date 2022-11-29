import type { DataFunctionArgs } from '@remix-run/node'
import { json } from '@remix-run/node'
import {
	Form,
	useLoaderData,
	useSearchParams,
	useSubmit,
} from '@remix-run/react'
import { useEffect, useRef, useState } from 'react'
import invariant from 'tiny-invariant'
import { prisma } from '~/db.server'
import { getClosestStarport } from '~/utils/geo.server'
import { CityCombobox } from './resources.city-combobox'
import { StarportCombobox } from './resources.starport-combobox'

async function getSearchResultsForStarport(starportId: string) {
	const ships = await prisma.ship.findMany({
		where: { starport: { id: starportId } },
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
	return { ships, brands, hosts, starports }
}

export async function loader({ request }: DataFunctionArgs) {
	const searchParams = new URL(request.url).searchParams
	const searchType = searchParams.get('searchType')
	const noResults = {
		searchType: 'none',
		ships: [],
		starports: [],
		brands: [],
		hosts: [],
		cities: [],
		distance: null,
	} as const
	if (!searchType) {
		return json(noResults)
	}

	switch (searchType) {
		case 'starportName': {
			const starportId = searchParams.get('starportId')
			invariant(starportId, 'starportId is required')
			const results = await getSearchResultsForStarport(starportId)
			return json({ ...noResults, ...results, searchType })
		}
		case 'city': {
			const cityId = searchParams.get('cityId')
			if (!cityId) return json(noResults)

			const city = await prisma.city.findUnique({
				where: { id: cityId },
				select: {
					id: true,
					name: true,
					country: true,
					latitude: true,
					longitude: true,
				},
			})
			if (!city) return json(noResults)

			const closestStarport = getClosestStarport(city)
			if (!closestStarport) return json(noResults)

			const results = await getSearchResultsForStarport(closestStarport.id)
			return json({
				...noResults,
				...results,
				searchType,
				cities: [city],
				distance: closestStarport.distance,
			})
		}
		case 'geolocation': {
			const latString = searchParams.get('lat')
			const longString = searchParams.get('long')
			if (!latString || !longString) return json(noResults)

			const latitude = Number(latString)
			const longitude = Number(longString)
			if (isNaN(latitude) || isNaN(longitude)) return json(noResults)

			const closestStarport = getClosestStarport({ latitude, longitude })
			if (!closestStarport) return json(noResults)

			const results = await getSearchResultsForStarport(closestStarport.id)
			return json({
				...noResults,
				...results,
				searchType,
				distance: closestStarport.distance,
			})
		}
		default: {
			throw new Error(`Invalid search type: ${searchType}`)
		}
	}
}

export default function ShipsRoute() {
	const data = useLoaderData<typeof loader>()
	const [searchParams] = useSearchParams()
	const [searchType, setSearchType] = useState(
		searchParams.get('searchType') ?? 'starportName',
	)
	const formRef = useRef<HTMLFormElement>(null)
	const submit = useSubmit()
	const defaultLat = Number(searchParams.get('lat'))
	const defaultLong = Number(searchParams.get('long'))
	const [geoLocation, setGeoLocation] = useState<
		| { lat: Number; long: Number; state: 'resolved' }
		| { state: 'pending' }
		| { state: 'rejected'; reason: string }
	>(() => {
		if (defaultLat && defaultLong) {
			return { lat: defaultLat, long: defaultLong, state: 'resolved' }
		}
		return { state: 'pending' }
	})

	useEffect(() => {
		if (searchType === 'geolocation' && geoLocation.state === 'pending') {
			navigator.geolocation.getCurrentPosition(
				position => {
					submit(
						{
							searchType: 'geolocation',
							lat: position.coords.latitude.toString(),
							long: position.coords.longitude.toString(),
						},
						{ action: '/search' },
					)
				},
				error => {
					setGeoLocation({
						state: 'rejected',
						reason: error.message,
					})
				},
			)
		}
	}, [geoLocation.state, searchType, submit])

	return (
		<div>
			<h1>Search</h1>
			<Form action="/search" ref={formRef}>
				<select
					name="searchType"
					value={searchType}
					onChange={e => setSearchType(e.currentTarget.value)}
				>
					<option value="starportName">Starport Name</option>
					<option value="city">City</option>
					<option value="geolocation">Current Location</option>
				</select>
				{searchType === 'starportName' ? (
					<StarportCombobox
						name="starportId"
						defaultSelectedStarport={data.starports.find(
							s => s.id === searchParams.get('starportId'),
						)}
						onChange={selectedStarport => {
							if (selectedStarport) {
								submit(formRef.current)
							}
						}}
					/>
				) : null}
				{searchType === 'city' ? (
					<CityCombobox
						name="cityId"
						defaultSelectedCity={data.cities.find(
							c => c.id === searchParams.get('cityId'),
						)}
						onChange={selectedCity => {
							if (selectedCity) {
								submit(formRef.current)
							}
						}}
					/>
				) : null}
			</Form>
			{data.ships.length ? (
				<>
					{data.distance === null ? null : searchType === 'geolocation' ? (
						<p>Distance from your location: {data.distance.toFixed(2)} miles</p>
					) : searchType === 'city' ? (
						<p>
							Distance from {data.cities[0]?.name}: {data.distance.toFixed(2)}{' '}
							miles
						</p>
					) : null}
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
			) : data.searchType === 'none' ? (
				<p>Enter a search query above</p>
			) : (
				<p>No ships found</p>
			)}
		</div>
	)
}

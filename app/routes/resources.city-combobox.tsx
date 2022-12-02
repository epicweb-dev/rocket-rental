import type { LoaderArgs, SerializeFrom } from '@remix-run/node'
import { json } from '@remix-run/node'
import { useFetcher } from '@remix-run/react'
import clsx from 'clsx'
import { useCombobox } from 'downshift'
import { useEffect, useId } from 'react'
import { useSpinDelay } from 'spin-delay'
import invariant from 'tiny-invariant'
import { prisma } from '~/db.server'
import { getClosestCitiesByName } from '~/utils/geo.server'

export async function loader({ request }: LoaderArgs) {
	const url = new URL(request.url)
	const query = url.searchParams.get('query')
	const lat = url.searchParams.get('lat')
	const long = url.searchParams.get('long')
	const exclude = url.searchParams.getAll('exclude')
	invariant(typeof query === 'string', 'query is required')

	let distances: ReturnType<typeof getClosestCitiesByName> | undefined
	let cities: Array<{ id: string; name: string; country: string }>
	if (lat && long) {
		distances = getClosestCitiesByName({
			latitude: Number(lat),
			longitude: Number(long),
			limit: 20,
			query: query,
			exclude,
		})
		cities = (
			await prisma.city.findMany({
				where: { id: { in: distances.map(s => s.id) } },
				select: { id: true, name: true, country: true },
			})
		).sort((a, b) => {
			const aDistance = distances?.find(s => s.id === a.id)
			const bDistance = distances?.find(s => s.id === b.id)
			if (!aDistance || !bDistance) return 0
			return aDistance.distance - bDistance.distance
		})
	} else {
		cities = await prisma.city.findMany({
			where: {
				AND: [{ name: { contains: query } }, { id: { notIn: exclude } }],
			},
			select: { id: true, name: true, country: true },
			take: 20,
		})
	}
	return json({
		cities: cities.map(s => ({
			...s,
			distance: distances?.find(d => d.id === s.id)?.distance,
		})),
	})
}

type City = SerializeFrom<typeof loader>['cities'][number]

export function CityCombobox({
	exclude,
	geolocation,
	onChange,
}: {
	exclude: Array<string>
	geolocation: { lat: number; long: number } | null
	onChange: (selectedStarport: City | null | undefined) => void
}) {
	const { submit: submitFetcher, ...cityFetcher } = useFetcher<typeof loader>()
	const id = useId()
	const cities = cityFetcher.data?.cities ?? []

	const cb = useCombobox<City>({
		id,
		onSelectedItemChange: ({ selectedItem }) => onChange(selectedItem),
		items: cities,
		selectedItem: null,
		itemToString: item => (item ? `${item.name} (${item.country})` : ''),
	})

	const excludeIds = exclude.join(',')
	useEffect(() => {
		const searchParams = new URLSearchParams()
		searchParams.set('query', cb.inputValue)
		if (geolocation) {
			searchParams.set('lat', geolocation.lat.toString())
			searchParams.set('long', geolocation.long.toString())
		}
		for (const ex of excludeIds.split(',')) {
			searchParams.append('exclude', ex)
		}

		submitFetcher(searchParams, {
			method: 'get',
			action: '/resources/city-combobox',
		})
	}, [cb.inputValue, excludeIds, geolocation, submitFetcher])

	const busy = cityFetcher.state !== 'idle'
	const showSpinner = useSpinDelay(busy, {
		delay: 150,
		minDuration: 300,
	})
	const displayMenu = cb.isOpen && cities.length > 0

	return (
		<div className="relative">
			<div className="flex flex-wrap items-center gap-1">
				<label {...cb.getLabelProps()}>City</label>
			</div>
			<div className="relative">
				<input
					{...cb.getInputProps({
						className: clsx('text-lg w-full border border-gray-500 px-2 py-1', {
							'rounded-t rounded-b-0': displayMenu,
							rounded: !displayMenu,
						}),
					})}
				/>
				<Spinner showSpinner={showSpinner} />
			</div>
			<ul
				{...cb.getMenuProps({
					className: clsx(
						'absolute z-10 bg-white shadow-lg rounded-b w-full border border-t-0 border-gray-500 max-h-[180px] overflow-scroll',
						{ hidden: !displayMenu },
					),
				})}
			>
				{displayMenu
					? cities.map((city, index) => (
							<li
								className={clsx('cursor-pointer py-1 px-2', {
									'bg-green-200': cb.highlightedIndex === index,
								})}
								key={city.id}
								{...cb.getItemProps({ item: city, index })}
							>
								{city.name} ({city.country}
								{city.distance ? ` ${city.distance.toFixed(2)}mi` : null})
							</li>
					  ))
					: null}
			</ul>
		</div>
	)
}

function Spinner({ showSpinner }: { showSpinner: boolean }) {
	return (
		<div
			className={`absolute right-0 top-[6px] transition-opacity ${
				showSpinner ? 'opacity-100' : 'opacity-0'
			}`}
		>
			<svg
				className="-ml-1 mr-3 h-5 w-5 animate-spin"
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
				width="1em"
				height="1em"
			>
				<circle
					className="opacity-25"
					cx={12}
					cy={12}
					r={10}
					stroke="currentColor"
					strokeWidth={4}
				/>
				<path
					className="opacity-75"
					fill="currentColor"
					d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
				/>
			</svg>
		</div>
	)
}

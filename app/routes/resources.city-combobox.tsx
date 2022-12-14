import type { LoaderArgs, SerializeFrom } from '@remix-run/node'
import { json } from '@remix-run/node'
import { useFetcher } from '@remix-run/react'
import clsx from 'clsx'
import { useCombobox } from 'downshift'
import { useEffect, useId } from 'react'
import { useSpinDelay } from 'spin-delay'
import invariant from 'tiny-invariant'
import { z } from 'zod'
import { Spinner } from '~/components/spinner'
import { prisma } from '~/utils/db.server'
import { getClosestCities } from '~/utils/geo.server'

const NullableNumber = z.union([z.coerce.number(), z.null()])

export async function loader({ request }: LoaderArgs) {
	const url = new URL(request.url)
	const query = url.searchParams.get('query')
	const latitude = NullableNumber.parse(url.searchParams.get('lat'))
	const longitude = NullableNumber.parse(url.searchParams.get('long'))
	const exclude = url.searchParams.getAll('exclude')
	invariant(typeof query === 'string', 'query is required')

	let cities: Array<{
		id: string
		displayName: string
		distance: number | null
	}>
	if (latitude !== null && longitude !== null) {
		cities = getClosestCities({
			latitude,
			longitude,
			limit: 20,
			query,
			exclude,
		})
	} else {
		cities = (
			await prisma.city.findMany({
				where: {
					AND: [{ name: { contains: query } }, { id: { notIn: exclude } }],
				},
				select: { id: true, name: true, country: true },
				take: 20,
			})
		).map(c => ({
			id: c.id,
			displayName: `${c.name}, ${c.country}`,
			distance: null,
		}))
	}

	return json({ cities })
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
		itemToString: item => (item ? item.displayName : ''),
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
								{city.displayName}
								{city.distance ? ` (${city.distance.toFixed(2)}mi)` : null}
							</li>
					  ))
					: null}
			</ul>
		</div>
	)
}

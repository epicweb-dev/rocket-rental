import type { LoaderArgs, SerializeFrom } from '@remix-run/node'
import { json } from '@remix-run/node'
import { useFetcher } from '@remix-run/react'
import clsx from 'clsx'
import { useCombobox } from 'downshift'
import { useEffect, useId, useRef } from 'react'
import { useSpinDelay } from 'spin-delay'
import { z } from 'zod'
import { Spinner } from '~/components/spinner'
import { prisma } from '~/utils/db.server'
import { getClosestCities } from '~/utils/geo.server'
import { parseSearchParams } from '~/utils/search-params'

const NullableNumber = z
	.string()
	.nullable()
	.optional()
	.transform(s => {
		const number = s ? Number(s) : null
		return number === null || Number.isNaN(number) ? null : number
	})

const SearchParamsSchema = z.object({
	query: z.string().default(''),
	lat: NullableNumber,
	long: NullableNumber,
	exclude: z.array(z.string()).default([]),
})

export async function loader({ request }: LoaderArgs) {
	const { query, lat, long, exclude } = parseSearchParams(
		new URL(request.url).searchParams,
		SearchParamsSchema,
	)

	let cities: Array<{
		id: string
		displayName: string
		distance: number | null
	}>
	if (lat !== null && long !== null) {
		cities = getClosestCities({ lat, long, query, exclude, limit: 20 })
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
	const fetcher = useFetcher<typeof loader>()
	const id = useId()
	const cities = fetcher.data?.cities ?? []

	const cb = useCombobox<City>({
		id,
		onSelectedItemChange: ({ selectedItem }) => onChange(selectedItem),
		items: cities,
		selectedItem: null,
		itemToString: item => (item ? item.displayName : ''),
	})

	const excludeIds = exclude.join(',')

	// https://github.com/remix-run/remix/issues/4872
	const submitRef = useRef(fetcher.submit)
	useEffect(() => {
		submitRef.current = fetcher.submit
	})

	useEffect(() => {
		const searchParams = new URLSearchParams()
		searchParams.set('query', cb.inputValue ?? '')
		if (geolocation) {
			searchParams.set('lat', geolocation.lat.toString())
			searchParams.set('long', geolocation.long.toString())
		}
		for (const ex of excludeIds.split(',')) {
			searchParams.append('exclude', ex)
		}

		submitRef.current(searchParams, {
			method: 'get',
			action: '/resources/city-combobox',
		})
	}, [cb.inputValue, excludeIds, geolocation])

	const busy = fetcher.state !== 'idle'
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

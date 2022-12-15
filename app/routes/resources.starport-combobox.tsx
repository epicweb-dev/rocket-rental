import type { LoaderArgs, SerializeFrom } from '@remix-run/node'
import { json } from '@remix-run/node'
import { useFetcher } from '@remix-run/react'
import clsx from 'clsx'
import { useCombobox } from 'downshift'
import { useEffect, useId, useRef } from 'react'
import { useSpinDelay } from 'spin-delay'
import { Spinner } from '~/components/spinner'
import { prisma } from '~/utils/db.server'
import { getClosestStarports } from '~/utils/geo.server'
import { z } from 'zod'
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

	let starports: Array<{
		id: string
		displayName: string
		distance: number | null
	}>
	if (lat !== null && long !== null) {
		starports = getClosestStarports({ lat, long, query, exclude, limit: 20 })
	} else {
		starports = (
			await prisma.starport.findMany({
				where: {
					AND: [{ name: { contains: query } }, { id: { notIn: exclude } }],
				},
				select: { id: true, name: true },
				take: 20,
			})
		).map(s => ({ id: s.id, displayName: s.name, distance: null }))
	}

	return json({ starports })
}

type Starport = SerializeFrom<typeof loader>['starports'][number]

export function StarportCombobox({
	exclude,
	geolocation,
	onChange,
}: {
	exclude: Array<string>
	geolocation: { lat: number; long: number } | null
	onChange: (selectedStarport: Starport | null | undefined) => void
}) {
	const fetcher = useFetcher<typeof loader>()
	const id = useId()
	const starports = fetcher.data?.starports ?? []

	const cb = useCombobox<Starport>({
		id,
		onSelectedItemChange: ({ selectedItem }) => onChange(selectedItem),
		items: starports,
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
			action: '/resources/starport-combobox',
		})
	}, [cb.inputValue, excludeIds, geolocation])

	const busy = fetcher.state !== 'idle'
	const showSpinner = useSpinDelay(busy, {
		delay: 150,
		minDuration: 300,
	})
	const displayMenu = cb.isOpen && starports.length > 0

	return (
		<div className="relative">
			<div className="flex flex-wrap items-center gap-1">
				<label {...cb.getLabelProps()}>Starport</label>
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
					? starports.map((starport, index) => (
							<li
								className={clsx('cursor-pointer py-1 px-2', {
									'bg-green-200': cb.highlightedIndex === index,
								})}
								key={starport.id}
								{...cb.getItemProps({ item: starport, index })}
							>
								{starport.displayName}{' '}
								{starport.distance
									? `(${starport.distance.toFixed(2)}mi)`
									: null}
							</li>
					  ))
					: null}
			</ul>
		</div>
	)
}

import type { LoaderArgs, SerializeFrom } from '@remix-run/node'
import { json } from '@remix-run/node'
import { useFetcher } from '@remix-run/react'
import clsx from 'clsx'
import { useCombobox } from 'downshift'
import { useEffect, useId } from 'react'
import { useSpinDelay } from 'spin-delay'
import invariant from 'tiny-invariant'
import { Spinner } from '~/components/spinner'
import { prisma } from '~/utils/db.server'
import { getClosestStarports } from '~/utils/geo.server'
import { z } from 'zod'

const NullableNumber = z.union([z.coerce.number(), z.null()])

export async function loader({ request }: LoaderArgs) {
	const url = new URL(request.url)
	const query = url.searchParams.get('query')
	const latitude = NullableNumber.parse(url.searchParams.get('lat'))
	const longitude = NullableNumber.parse(url.searchParams.get('long'))
	const exclude = url.searchParams.getAll('exclude')
	invariant(typeof query === 'string', 'query is required')

	let starports: Array<{
		id: string
		displayName: string
		distance: number | null
	}>
	if (latitude !== null && longitude !== null) {
		starports = getClosestStarports({
			latitude,
			longitude,
			limit: 20,
			query,
			exclude,
		})
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
	const { submit: submitFetcher, ...starportFetcher } =
		useFetcher<typeof loader>()
	const id = useId()
	const starports = starportFetcher.data?.starports ?? []

	const cb = useCombobox<Starport>({
		id,
		onSelectedItemChange: ({ selectedItem }) => onChange(selectedItem),
		items: starports,
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
			action: '/resources/starport-combobox',
		})
	}, [cb.inputValue, excludeIds, geolocation, submitFetcher])

	const busy = starportFetcher.state !== 'idle'
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

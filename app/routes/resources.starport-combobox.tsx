import type { LoaderArgs, SerializeFrom } from '@remix-run/node'
import { json } from '@remix-run/node'
import { useFetcher } from '@remix-run/react'
import clsx from 'clsx'
import { useCombobox } from 'downshift'
import { useEffect, useId } from 'react'
import { useSpinDelay } from 'spin-delay'
import invariant from 'tiny-invariant'
import { prisma } from '~/utils/db.server'
import { getClosestStarports } from '~/utils/geo.server'

export async function loader({ request }: LoaderArgs) {
	const url = new URL(request.url)
	const query = url.searchParams.get('query')
	const lat = url.searchParams.get('lat')
	const long = url.searchParams.get('long')
	const exclude = url.searchParams.getAll('exclude')
	invariant(typeof query === 'string', 'query is required')

	let distances: ReturnType<typeof getClosestStarports> | undefined
	let starports: Array<{ id: string; name: string }>
	if (lat && long) {
		distances = getClosestStarports({
			latitude: Number(lat),
			longitude: Number(long),
			limit: 20,
			query: query,
			exclude,
		})
		starports = (
			await prisma.starport.findMany({
				where: { id: { in: distances.map(s => s.id) } },
				select: { id: true, name: true },
			})
		).sort((a, b) => {
			const aDistance = distances?.find(s => s.id === a.id)
			const bDistance = distances?.find(s => s.id === b.id)
			if (!aDistance || !bDistance) return 0
			return aDistance.distance - bDistance.distance
		})
	} else {
		starports = await prisma.starport.findMany({
			where: {
				AND: [{ name: { contains: query } }, { id: { notIn: exclude } }],
			},
			select: { id: true, name: true },
			take: 20,
		})
	}
	return json({
		starports: starports.map(s => ({
			...s,
			distance: distances?.find(d => d.id === s.id)?.distance,
		})),
	})
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
		itemToString: item => (item ? item.name : ''),
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
								{starport.name}{' '}
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

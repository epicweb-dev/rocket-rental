import { useFetcher } from '@remix-run/react'
import clsx from 'clsx'
import { useCombobox } from 'downshift'
import { useEffect, useId, useRef } from 'react'
import { useSpinDelay } from 'spin-delay'
import { z } from 'zod'
import { Spinner } from './spinner'

export type GeoItem = {
	id: string
	displayName: string
	distance: number | null
}

export type BaseOptions = {
	exclude: Array<string>
	geolocation: { lat: number; long: number } | null
	onChange: (selectedHost: GeoItem | null | undefined) => void
}

const NullableNumber = z
	.string()
	.nullable()
	.optional()
	.transform(s => {
		const number = s ? Number(s) : null
		return number === null || Number.isNaN(number) ? null : number
	})

export const SearchParamsSchema = z.object({
	query: z.string().default(''),
	lat: NullableNumber,
	long: NullableNumber,
	exclude: z.array(z.string()).default([]),
})

export function GeoSearchCombobox({
	exclude,
	geolocation,
	onChange,
	label,
	resourceUrl,
}: BaseOptions & {
	label: string
	resourceUrl: string
}) {
	const fetcher = useFetcher()
	const id = useId()
	// TODO: make this type better
	const items = (fetcher.data?.items ?? []) as Array<GeoItem>

	const cb = useCombobox<GeoItem>({
		id,
		onSelectedItemChange: ({ selectedItem }) => onChange(selectedItem),
		items,
		selectedItem: null,
		itemToString: item => item?.displayName ?? '',
	})

	const excludeIds = exclude.join(',')

	// https://github.com/remix-run/remix/issues/4872
	const submitRef = useRef(fetcher.submit)
	useEffect(() => {
		submitRef.current = fetcher.submit
	})

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

		submitRef.current(searchParams, {
			method: 'get',
			action: resourceUrl,
		})
	}, [cb.inputValue, excludeIds, geolocation, resourceUrl])

	const busy = fetcher.state !== 'idle'
	const showSpinner = useSpinDelay(busy, {
		delay: 150,
		minDuration: 300,
	})
	const displayMenu = cb.isOpen && items.length > 0

	return (
		<div className="relative">
			<div className="flex flex-wrap items-center gap-1">
				<label {...cb.getLabelProps()}>{label}</label>
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
					? items.map((item, index) => (
							<li
								className={clsx(
									'flex cursor-pointer items-center gap-2 py-1 px-2',
									{ 'bg-green-200': cb.highlightedIndex === index },
								)}
								key={item.id}
								{...cb.getItemProps({ item: item, index })}
							>
								{item.displayName}{' '}
								{item.distance ? `(${item.distance.toFixed(2)}mi)` : null}
							</li>
					  ))
					: null}
			</ul>
		</div>
	)
}

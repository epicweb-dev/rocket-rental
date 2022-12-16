import { useFetcher } from '@remix-run/react'
import clsx from 'clsx'
import { useCombobox } from 'downshift'
import { useEffect, useId, useRef } from 'react'
import { useSpinDelay } from 'spin-delay'
import { z } from 'zod'
import { Spinner } from './spinner'

export type SearchComboboxProps<Item> = {
	selectedItem?: Item | null | undefined
	exclude?: Array<string> | null
	onChange: (selectedHost: Item | null | undefined) => void
	itemToString: (item: Item | null | undefined) => string
	itemToKey: (item: Item) => string
	label: string
	renderItemInList: (item: Item) => React.ReactNode
	resourceUrl: string
	additionalSearchParams?: Record<string, string | Array<string>> | null
}

export const SearchParamsSchema = z.object({
	query: z.string().default(''),
	exclude: z.array(z.string()).default([]),
})

export function SearchCombobox<Item>({
	selectedItem,
	exclude,
	onChange,
	itemToString,
	itemToKey,
	label,
	renderItemInList,
	resourceUrl,
	additionalSearchParams,
}: SearchComboboxProps<Item>) {
	const fetcher = useFetcher()
	const id = useId()
	// TODO: make this type better
	const items = (fetcher.data?.items ?? []) as Array<Item>

	const cb = useCombobox<Item>({
		id,
		onSelectedItemChange: ({ selectedItem }) => onChange(selectedItem),
		items,
		selectedItem,
		itemToString,
	})

	const searchParams = new URLSearchParams()
	searchParams.set('query', cb.inputValue)
	for (const ex of exclude ?? []) {
		searchParams.append('exclude', ex)
	}
	for (const [key, value] of Object.entries(additionalSearchParams ?? {})) {
		for (const v of Array.isArray(value) ? value : [value]) {
			searchParams.append(key, v)
		}
	}
	const fetchUrl = `${resourceUrl}?${searchParams}`
	const loadRef = useRef(fetcher.load)
	useEffect(() => {
		loadRef.current = fetcher.load
	})
	useEffect(() => loadRef.current(fetchUrl), [fetchUrl])

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
								key={itemToKey(item)}
								{...cb.getItemProps({ item: item, index })}
							>
								{renderItemInList(item)}
							</li>
					  ))
					: null}
			</ul>
		</div>
	)
}

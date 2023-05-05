import { useFetcher } from '@remix-run/react'
import { clsx } from 'clsx'
import { useCombobox } from 'downshift'
import { useEffect, useId, useRef } from 'react'
import { useSpinDelay } from 'spin-delay'
import { z } from 'zod'
import { Spinner } from './spinner.tsx'

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
	placeholder?: string
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
	placeholder,
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

	useEffect(() => {
		loadRef.current(fetchUrl)
	}, [fetchUrl])

	const busy = fetcher.state !== 'idle'

	const showSpinner = useSpinDelay(busy, {
		delay: 150,
		minDuration: 300,
	})
	const displayMenu = cb.isOpen && items.length > 0

	const menuClassName =
		'absolute z-10 mt-4 min-w-[448px] max-h-[336px] bg-white text-night-400 shadow-lg rounded-3xl w-full overflow-scroll divide-solid divide-night-100 divide-y'

	return (
		<div className="relative">
			<div className="group relative">
				<label
					htmlFor={id}
					className="absolute left-8 top-5 text-xs text-white group-focus-within:text-black"
				>
					{label}
				</label>
				<input
					className="h-[88px] w-full rounded-full bg-night-500 pl-8 pr-5 pt-8 text-body-xs caret-black outline-none placeholder:text-night-300 focus:border-accent-purple focus:bg-white focus:text-night-500 focus:placeholder:text-night-500"
					{...cb.getInputProps({ id, placeholder })}
				/>
				<div className="absolute right-4 top-[44px]">
					<Spinner showSpinner={showSpinner} />
				</div>
				{/* TODO: display errors */}
			</div>
			<ul
				{...cb.getMenuProps({
					className: clsx(menuClassName, { hidden: !displayMenu }),
				})}
			>
				{displayMenu
					? items.map((item, index) => (
							<li
								className="mx-6 cursor-pointer py-2"
								key={itemToKey(item)}
								{...cb.getItemProps({ item: item, index })}
							>
								<div
									className={`flex w-full items-center gap-2 rounded-full px-2 py-2 ${
										cb.highlightedIndex === index ? 'bg-night-100' : ''
									}`}
								>
									{renderItemInList(item)}
								</div>
							</li>
					  ))
					: null}
			</ul>
		</div>
	)
}

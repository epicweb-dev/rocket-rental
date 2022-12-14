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

export async function loader({ request }: LoaderArgs) {
	const url = new URL(request.url)
	const query = url.searchParams.get('query')
	const exclude = url.searchParams.getAll('exclude')
	invariant(typeof query === 'string', 'query is required')
	const brands = await prisma.shipBrand.findMany({
		where: {
			AND: [{ name: { contains: query } }, { id: { notIn: exclude } }],
		},
		select: {
			id: true,
			imageUrl: true,
			name: true,
		},
	})
	return json({ brands })
}

type Brand = SerializeFrom<typeof loader>['brands'][number]

export function BrandCombobox({
	exclude,
	onChange,
}: {
	exclude: Array<string>
	onChange: (selectedBrand: Brand | null | undefined) => void
}) {
	const { submit: submitFetcher, ...brandFetcher } = useFetcher<typeof loader>()
	const id = useId()
	const brands = brandFetcher.data?.brands ?? []

	const cb = useCombobox<Brand>({
		id,
		onSelectedItemChange: ({ selectedItem }) => onChange(selectedItem),
		items: brands,
		selectedItem: null,
		itemToString: item => (item ? item.name : ''),
	})

	const excludeIds = exclude.join(',')
	useEffect(() => {
		const searchParams = new URLSearchParams()
		searchParams.set('query', cb.inputValue)
		for (const ex of excludeIds.split(',')) {
			searchParams.append('exclude', ex)
		}

		submitFetcher(searchParams, {
			method: 'get',
			action: '/resources/brand-combobox',
		})
	}, [cb.inputValue, excludeIds, submitFetcher])

	const busy = brandFetcher.state !== 'idle'
	const showSpinner = useSpinDelay(busy, {
		delay: 150,
		minDuration: 300,
	})
	const displayMenu = cb.isOpen && brands.length > 0

	return (
		<div className="relative">
			<div className="flex flex-wrap items-center gap-1">
				<label {...cb.getLabelProps()}>Brand</label>
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
					? brands.map((brand, index) => (
							<li
								className={clsx(
									'flex cursor-pointer items-center gap-2 py-1 px-2',
									{
										'bg-green-200': cb.highlightedIndex === index,
									},
								)}
								key={brand.id}
								{...cb.getItemProps({ item: brand, index })}
							>
								{brand.imageUrl ? (
									<img
										src={brand.imageUrl}
										alt={brand.name}
										className="h-8 w-8 rounded-full"
									/>
								) : null}
								{brand.name}
							</li>
					  ))
					: null}
			</ul>
		</div>
	)
}

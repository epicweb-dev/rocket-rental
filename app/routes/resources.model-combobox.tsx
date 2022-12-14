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
	const models = await prisma.shipModel.findMany({
		where: {
			AND: [{ name: { contains: query } }, { id: { notIn: exclude } }],
		},
		select: {
			id: true,
			imageUrl: true,
			name: true,
		},
	})
	return json({ models })
}

type Model = SerializeFrom<typeof loader>['models'][number]

export function ModelCombobox({
	exclude,
	onChange,
}: {
	exclude: Array<string>
	onChange: (selectedModel: Model | null | undefined) => void
}) {
	const { submit: submitFetcher, ...modelFetcher } = useFetcher<typeof loader>()
	const id = useId()
	const models = modelFetcher.data?.models ?? []

	const cb = useCombobox<Model>({
		id,
		onSelectedItemChange: ({ selectedItem }) => onChange(selectedItem),
		items: models,
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
			action: '/resources/model-combobox',
		})
	}, [cb.inputValue, excludeIds, submitFetcher])

	const busy = modelFetcher.state !== 'idle'
	const showSpinner = useSpinDelay(busy, {
		delay: 150,
		minDuration: 300,
	})
	const displayMenu = cb.isOpen && models.length > 0

	return (
		<div className="relative">
			<div className="flex flex-wrap items-center gap-1">
				<label {...cb.getLabelProps()}>Model</label>
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
					? models.map((model, index) => (
							<li
								className={clsx(
									'flex cursor-pointer items-center gap-2 py-1 px-2',
									{
										'bg-green-200': cb.highlightedIndex === index,
									},
								)}
								key={model.id}
								{...cb.getItemProps({ item: model, index })}
							>
								{model.imageUrl ? (
									<img
										src={model.imageUrl}
										alt={model.name}
										className="h-8 w-8 rounded-full"
									/>
								) : null}
								{model.name}
							</li>
					  ))
					: null}
			</ul>
		</div>
	)
}

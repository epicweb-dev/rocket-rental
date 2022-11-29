import type { LoaderArgs, SerializeFrom } from '@remix-run/node'
import { json } from '@remix-run/node'
import { useFetcher } from '@remix-run/react'
import clsx from 'clsx'
import { useCombobox } from 'downshift'
import { useId, useState } from 'react'
import { useSpinDelay } from 'spin-delay'
import invariant from 'tiny-invariant'
import { prisma } from '~/db.server'

export async function loader({ request }: LoaderArgs) {
	const url = new URL(request.url)
	const query = url.searchParams.get('query')
	invariant(typeof query === 'string', 'query is required')
	return json({
		starports: await prisma.starport.findMany({
			where: { name: { contains: query } },
			select: { id: true, name: true },
			take: 20,
		}),
	})
}

type Starport = SerializeFrom<typeof loader>['starports'][number]

export function StarportCombobox({
	error,
	name,
	defaultSelectedStarport,
	onChange,
}: {
	error?: string | null
	name: string
	defaultSelectedStarport?: Starport | null
	onChange?: (selectedStarport: Starport | null | undefined) => void
}) {
	const starportFetcher = useFetcher<typeof loader>()
	const id = useId()
	const starports = starportFetcher.data?.starports ?? []
	const [selectedStarport, setSelectedStarport] = useState<
		Starport | null | undefined
	>(defaultSelectedStarport)

	const cb = useCombobox<Starport>({
		id,
		onSelectedItemChange: ({ selectedItem }) => {
			setSelectedStarport(selectedItem)
			requestAnimationFrame(() => {
				onChange?.(selectedItem)
			})
		},
		items: starports,
		defaultSelectedItem: defaultSelectedStarport,
		itemToString: item => (item ? item.name : ''),
		onInputValueChange: changes => {
			starportFetcher.submit(
				{ query: changes.inputValue ?? '' },
				{ method: 'get', action: '/resources/starport-combobox' },
			)
		},
	})

	const busy = starportFetcher.state !== 'idle'
	const showSpinner = useSpinDelay(busy, {
		delay: 150,
		minDuration: 300,
	})
	const displayMenu = cb.isOpen && starports.length > 0

	return (
		<div className="relative">
			<input name={name} type="hidden" value={selectedStarport?.id ?? ''} />
			<div className="flex flex-wrap items-center gap-1">
				<label {...cb.getLabelProps()}>Starport</label>
				{error ? (
					<em id="starport-error" className="text-d-p-xs text-red-600">
						{error}
					</em>
				) : null}
			</div>
			<div className="relative">
				<input
					{...cb.getInputProps({
						className: clsx('text-lg w-full border border-gray-500 px-2 py-1', {
							'rounded-t rounded-b-0': displayMenu,
							rounded: !displayMenu,
						}),
						'aria-invalid': Boolean(error) || undefined,
						'aria-errormessage': error ? 'starport-error' : undefined,
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
								{starport.name}
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

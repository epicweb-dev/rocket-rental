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
		cities: await prisma.city.findMany({
			where: {
				OR: [{ name: { contains: query } }, { country: { contains: query } }],
			},
			select: { id: true, name: true, country: true },
			take: 20,
		}),
	})
}

type City = SerializeFrom<typeof loader>['cities'][number]

export function CityCombobox({
	error,
	name,
	defaultSelectedCity,
	onChange,
}: {
	error?: string | null
	name: string
	defaultSelectedCity?: City | null
	onChange?: (selectedCity: City | null | undefined) => void
}) {
	const cityFetcher = useFetcher<typeof loader>()
	const id = useId()
	const cities = cityFetcher.data?.cities ?? []
	const [selectedCity, setSelectedCity] = useState<City | null | undefined>(
		defaultSelectedCity,
	)

	const cb = useCombobox<City>({
		id,
		onSelectedItemChange: ({ selectedItem }) => {
			setSelectedCity(selectedItem)
			requestAnimationFrame(() => {
				onChange?.(selectedItem)
			})
		},
		items: cities,
		defaultSelectedItem: defaultSelectedCity,
		itemToString: item => (item ? `${item.name} (${item.country})` : ''),
		onInputValueChange: changes => {
			cityFetcher.submit(
				{ query: changes.inputValue ?? '' },
				{ method: 'get', action: '/resources/city-combobox' },
			)
		},
	})

	const busy = cityFetcher.state !== 'idle'
	const showSpinner = useSpinDelay(busy, {
		delay: 150,
		minDuration: 300,
	})
	const displayMenu = cb.isOpen && cities.length > 0

	return (
		<div className="relative">
			<input name={name} type="hidden" value={selectedCity?.id ?? ''} />
			<div className="flex flex-wrap items-center gap-1">
				<label {...cb.getLabelProps()}>City</label>
				{error ? (
					<em id="city-error" className="text-d-p-xs text-red-600">
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
						'aria-errormessage': error ? 'city-error' : undefined,
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
								{city.name} ({city.country})
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

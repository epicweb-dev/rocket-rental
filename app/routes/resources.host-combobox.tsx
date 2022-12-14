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
	const hosts = await prisma.host.findMany({
		where: {
			AND: [
				{
					OR: [
						{ user: { name: { contains: query } } },
						{ user: { email: { contains: query } } },
					],
				},
				{ userId: { notIn: exclude } },
			],
		},
		select: {
			user: {
				select: {
					id: true,
					name: true,
					imageUrl: true,
				},
			},
		},
	})
	return json({ hosts })
}

type Host = SerializeFrom<typeof loader>['hosts'][number]

export function HostCombobox({
	exclude,
	onChange,
}: {
	exclude: Array<string>
	onChange: (selectedHost: Host | null | undefined) => void
}) {
	const { submit: submitFetcher, ...hostFetcher } = useFetcher<typeof loader>()
	const id = useId()
	const hosts = hostFetcher.data?.hosts ?? []

	const cb = useCombobox<Host>({
		id,
		onSelectedItemChange: ({ selectedItem }) => onChange(selectedItem),
		items: hosts,
		selectedItem: null,
		itemToString: item => (item ? item.user.name ?? 'Unnamed host' : ''),
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
			action: '/resources/host-combobox',
		})
	}, [cb.inputValue, excludeIds, submitFetcher])

	const busy = hostFetcher.state !== 'idle'
	const showSpinner = useSpinDelay(busy, {
		delay: 150,
		minDuration: 300,
	})
	const displayMenu = cb.isOpen && hosts.length > 0

	return (
		<div className="relative">
			<div className="flex flex-wrap items-center gap-1">
				<label {...cb.getLabelProps()}>Host</label>
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
					? hosts.map((host, index) => (
							<li
								className={clsx(
									'flex cursor-pointer items-center gap-2 py-1 px-2',
									{ 'bg-green-200': cb.highlightedIndex === index },
								)}
								key={host.user.id}
								{...cb.getItemProps({ item: host, index })}
							>
								{host.user.imageUrl ? (
									<img
										src={host.user.imageUrl}
										alt={host.user.name ?? 'Unnamed host'}
										className="h-8 w-8 rounded-full"
									/>
								) : null}
								{host.user.name ?? 'Unnamed host'}
							</li>
					  ))
					: null}
			</ul>
		</div>
	)
}

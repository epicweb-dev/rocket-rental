import type { LoaderArgs, SerializeFrom } from '@remix-run/node'
import { json } from '@remix-run/node'
import {
	BasicSearchCombobox,
	SearchParamsSchema,
	type BaseOptions,
} from '~/components/basic-search-combobox'
import { prisma } from '~/utils/db.server'
import { parseSearchParams } from '~/utils/search-params'

export async function loader({ request }: LoaderArgs) {
	const { query, exclude } = parseSearchParams(
		new URL(request.url).searchParams,
		SearchParamsSchema,
	)

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
		take: 20,
	})
	return json({ items: hosts })
}

type Host = SerializeFrom<typeof loader>['items'][number]

export function HostCombobox({ ...baseOptions }: BaseOptions<Host>) {
	return (
		<BasicSearchCombobox
			{...baseOptions}
			itemToKey={item => item.user.id}
			itemToString={item => item?.user.name ?? ''}
			label="Host"
			resourceUrl="/resources/host-combobox"
			renderItemInList={host => (
				<>
					{host.user.imageUrl ? (
						<img
							src={host.user.imageUrl}
							alt={host.user.name ?? 'Unnamed host'}
							className="h-8 w-8 rounded-full"
						/>
					) : null}
					{host.user.name ?? 'Unnamed host'}
				</>
			)}
		/>
	)
}

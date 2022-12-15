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

	const models = await prisma.shipModel.findMany({
		where: {
			AND: [{ name: { contains: query } }, { id: { notIn: exclude } }],
		},
		select: {
			id: true,
			imageUrl: true,
			name: true,
		},
		take: 20,
	})
	return json({ items: models })
}

type Model = SerializeFrom<typeof loader>['items'][number]

export function ModelCombobox({ ...baseOptions }: BaseOptions<Model>) {
	return (
		<BasicSearchCombobox
			{...baseOptions}
			itemToKey={item => item.id}
			itemToString={item => item?.name ?? ''}
			label="Model"
			resourceUrl="/resources/model-combobox"
			renderItemInList={model => (
				<>
					{model.imageUrl ? (
						<img
							src={model.imageUrl}
							alt={model.name}
							className="h-8 w-8 rounded-full"
						/>
					) : null}
					{model.name}
				</>
			)}
		/>
	)
}

import type { LoaderArgs, SerializeFrom } from '@remix-run/node'
import { json } from '@remix-run/node'
import {
	BasicSearchCombobox,
	type BaseOptions,
} from '~/components/basic-search-combobox'
import { prisma } from '~/utils/db.server'
import { getSearchParamsOrFail } from 'remix-params-helper'
import { z } from 'zod'
import { getImgSrc, typedBoolean } from '~/utils/misc'

export const SearchParamsSchema = z.object({
	query: z.string().default(''),
	exclude: z.array(z.string()).default([]),
	brandIds: z.array(z.string()).default([]),
})

export async function loader({ request }: LoaderArgs) {
	const { query, exclude, brandIds } = getSearchParamsOrFail(
		request,
		SearchParamsSchema,
	)

	const models = await prisma.shipModel.findMany({
		where: {
			AND: [
				{ name: { contains: query } },
				{ id: { notIn: exclude } },
				brandIds.length ? { brandId: { in: brandIds } } : null,
			].filter(typedBoolean),
		},
		select: {
			id: true,
			imageId: true,
			name: true,
		},
		take: 20,
	})
	return json({ items: models })
}

type Model = SerializeFrom<typeof loader>['items'][number]

export function ModelCombobox({
	brandIds = [],
	...baseOptions
}: BaseOptions<Model> & { brandIds?: Array<string> }) {
	return (
		<BasicSearchCombobox
			{...baseOptions}
			additionalSearchParams={{ brandIds }}
			itemToKey={item => item.id}
			itemToString={item => item?.name ?? ''}
			label="Model"
			resourceUrl="/resources/model-combobox"
			renderItemInList={model => (
				<>
					{model.imageId ? (
						<img
							src={getImgSrc(model.imageId)}
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

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

	const brands = await prisma.shipBrand.findMany({
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
	return json({ items: brands })
}

type Brand = SerializeFrom<typeof loader>['items'][number]

export function BrandCombobox({ ...baseOptions }: BaseOptions<Brand>) {
	return (
		<BasicSearchCombobox
			{...baseOptions}
			itemToKey={item => item.id}
			itemToString={item => item?.name ?? ''}
			label="Brand"
			resourceUrl="/resources/brand-combobox"
			renderItemInList={brand => (
				<>
					{brand.imageUrl ? (
						<img
							src={brand.imageUrl}
							alt={brand.name}
							className="h-8 w-8 rounded-full"
						/>
					) : null}
					{brand.name}
				</>
			)}
		/>
	)
}

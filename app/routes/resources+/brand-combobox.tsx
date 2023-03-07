import {
	json,
	type DataFunctionArgs,
	type SerializeFrom,
} from '@remix-run/node'
import {
	BasicSearchCombobox,
	SearchParamsSchema,
	type BaseOptions,
} from '~/components/basic-search-combobox'
import { prisma } from '~/utils/db.server'
import { preprocessSearchParams } from '~/utils/forms'
import { getImgSrc } from '~/utils/misc'

export async function loader({ request }: DataFunctionArgs) {
	const data = preprocessSearchParams(request, SearchParamsSchema)
	const { query, exclude } = SearchParamsSchema.parse(data)

	const brands = await prisma.shipBrand.findMany({
		where: {
			AND: [{ name: { contains: query } }, { id: { notIn: exclude } }],
		},
		select: {
			id: true,
			imageId: true,
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
					{brand.imageId ? (
						<img
							src={getImgSrc(brand.imageId)}
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

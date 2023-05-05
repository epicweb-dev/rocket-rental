import { json, type DataFunctionArgs } from '@remix-run/node'
import {
	GeoSearchCombobox,
	SearchParamsSchema,
	type BaseOptions,
	type GeoItem,
} from '~/components/geo-search-combobox.tsx'
import { prisma } from '~/utils/db.server.ts'
import { preprocessSearchParams } from '~/utils/forms.tsx'
import { getClosestStarports } from '~/utils/geo.server.ts'

export async function loader({ request }: DataFunctionArgs) {
	const data = preprocessSearchParams(request, SearchParamsSchema)
	const { query, lat, long, exclude } = SearchParamsSchema.parse(data)

	let starports: Array<GeoItem>
	if (lat !== undefined && long !== undefined) {
		starports = getClosestStarports({ lat, long, query, exclude, limit: 20 })
	} else {
		starports = (
			await prisma.starport.findMany({
				where: {
					AND: [{ name: { contains: query } }, { id: { notIn: exclude } }],
				},
				select: { id: true, name: true },
				take: 20,
			})
		).map(s => ({ id: s.id, displayName: s.name, distance: null }))
	}

	return json({ items: starports })
}

export function StarportCombobox({ ...baseOptions }: BaseOptions) {
	return (
		<GeoSearchCombobox
			{...baseOptions}
			label="Starport"
			resourceUrl="/resources/starport-combobox"
		/>
	)
}

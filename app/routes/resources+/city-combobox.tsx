import { json, type DataFunctionArgs } from '@remix-run/node'
import {
	GeoSearchCombobox,
	SearchParamsSchema,
	type BaseOptions,
} from '~/components/geo-search-combobox'
import { prisma } from '~/utils/db.server'
import { preprocessSearchParams } from '~/utils/forms'
import { getClosestCities } from '~/utils/geo.server'

export async function loader({ request }: DataFunctionArgs) {
	const data = preprocessSearchParams(request, SearchParamsSchema)
	const { query, lat, long, exclude } = SearchParamsSchema.parse(data)

	let cities: Array<{
		id: string
		displayName: string
		distance: number | null
	}>
	if (lat !== undefined && long !== undefined) {
		cities = getClosestCities({ lat, long, query, exclude, limit: 20 })
	} else {
		cities = (
			await prisma.city.findMany({
				where: {
					AND: [{ name: { contains: query } }, { id: { notIn: exclude } }],
				},
				select: { id: true, name: true, country: true },
				take: 20,
			})
		).map(c => ({
			id: c.id,
			displayName: `${c.name}, ${c.country}`,
			distance: null,
		}))
	}

	return json({ items: cities })
}

export function CityCombobox({ ...baseOptions }: BaseOptions) {
	return (
		<GeoSearchCombobox
			{...baseOptions}
			label="City"
			resourceUrl="/resources/city-combobox"
		/>
	)
}

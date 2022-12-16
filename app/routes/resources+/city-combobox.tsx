import type { LoaderArgs } from '@remix-run/node'
import { json } from '@remix-run/node'
import type { BaseOptions } from '~/components/geo-search-combobox'
import { SearchParamsSchema } from '~/components/geo-search-combobox'
import { GeoSearchCombobox } from '~/components/geo-search-combobox'
import { prisma } from '~/utils/db.server'
import { getClosestCities } from '~/utils/geo.server'
import { getSearchParamsOrFail } from 'remix-params-helper'

export async function loader({ request }: LoaderArgs) {
	const { query, lat, long, exclude } = getSearchParamsOrFail(
		request,
		SearchParamsSchema,
	)

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

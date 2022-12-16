import type { LoaderArgs } from '@remix-run/node'
import { json } from '@remix-run/node'
import type { BaseOptions, GeoItem } from '~/components/geo-search-combobox'
import { SearchParamsSchema } from '~/components/geo-search-combobox'
import { GeoSearchCombobox } from '~/components/geo-search-combobox'
import { prisma } from '~/utils/db.server'
import { getClosestStarports } from '~/utils/geo.server'
import { getSearchParamsOrFail } from 'remix-params-helper'

export async function loader({ request }: LoaderArgs) {
	const { query, lat, long, exclude } = getSearchParamsOrFail(
		request,
		SearchParamsSchema,
	)

	let starports: Array<GeoItem>
	if (lat !== null && long !== null) {
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

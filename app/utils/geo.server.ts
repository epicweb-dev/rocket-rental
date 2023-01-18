import { db, interpolateArray } from '~/utils/db.server'
import { z } from 'zod'
import { typedBoolean } from './misc'

const GeoResults = z.array(
	z.object({
		id: z.string(),
		displayName: z.string(),
		distance: z.number(),
	}),
)

/**
 * Make 100% certain that this function is never called with user input as it
 * is used to generate a part of a SQL query.
 *
 * IDEA: Maybe figure out how to sanitize the inputs?
 * @returns
 */
export function getDistanceCalculation({
	from,
	to,
}: {
	from: { lat: string; long: string }
	to: { lat: string; long: string }
}) {
	return /* sql */ `
acos(
	sin(${from.lat} * PI()/180)
	* sin(${to.lat} * PI()/180)
	+ cos(${from.lat} * PI()/180)
	* cos(${to.lat} * PI()/180)
	* cos((${from.long} - ${to.long}) * PI()/180)
)
* 180/PI() * 60
-- convert from nautical miles to miles
* 1.1515
	`.trim()
}

type BaseOptions = {
	lat: number
	long: number
	query?: string
	exclude?: Array<string>
	limit: number
}

export function getClosestCities(options: BaseOptions) {
	return getClosestWithQuery({
		...options,
		queryProperties: ['name', 'country'],
		displayNameSelect: `name || ', ' || country`,
		table: 'city',
	})
}

export function getClosestStarports(options: BaseOptions) {
	return getClosestWithQuery({
		...options,
		queryProperties: ['name'],
		displayNameSelect: `name`,
		table: 'starport',
	})
}

/**
 * This is a bit of a tight abstraction, so please do not export it. Duplicate instead.
 * All usages of this function should be within this file.
 */
function getClosestWithQuery({
	lat,
	long,
	query,
	limit,
	exclude = [],
	queryProperties,
	displayNameSelect,
	table,
}: BaseOptions & {
	queryProperties: Array<string>
	displayNameSelect: string
	table: string
}) {
	const excludeInter = interpolateArray(exclude, 'exclude')
	const queries = queryProperties.map(p => `${p} LIKE @query`).join(' OR ')
	const wheres = [
		query ? `(${queries})` : null,
		exclude.length ? `id NOT IN (${excludeInter.query})` : null,
	]
		.filter(typedBoolean)
		.join(' AND ')
	const interpolations = {
		lat,
		long,
		query: `%${query}%`,
		...excludeInter.interpolations,
		limit,
	}

	const distanceCalculation = getDistanceCalculation({
		from: { lat: '@lat', long: '@long' },
		to: { lat: 'latitude', long: 'longitude' },
	})

	const sql = /*sql*/ `
		SELECT
			id,
			${displayNameSelect} AS displayName,
			COALESCE(${distanceCalculation}, 0) AS distance
		FROM ${table}
		${wheres ? `WHERE ${wheres}` : ''}
		ORDER BY distance ASC
		LIMIT @limit;
	`

	const results = db.prepare(sql).all(interpolations)
	return GeoResults.parse(results)
}

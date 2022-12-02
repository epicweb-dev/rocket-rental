import { db } from '~/db.server'
import { typedBoolean } from './misc'

export function getClosestStarports({
	latitude,
	longitude,
	query,
	limit,
	exclude = [],
}: {
	latitude: number
	longitude: number
	query?: string
	exclude?: Array<string>
	limit: number
}) {
	const excludeInter = interpolateArray(exclude)
	const wheres = [
		query ? `name LIKE @query` : null,
		exclude.length ? `id NOT IN (${excludeInter.query})` : null,
	]
		.filter(typedBoolean)
		.join(' AND ')
	const interpolations = {
		latitude,
		longitude,
		query: `%${query}%`,
		...excludeInter.interpolations,
		limit,
	}

	const results = db
		.prepare(
			/*sql*/ `
SELECT
id,
acos(
  sin(@latitude * PI()/180)
  * sin(latitude * PI()/180)
  + cos(@latitude * PI()/180)
  * cos(latitude * PI()/180)
  * cos((@longitude - longitude) * PI()/180)
)
* 180/PI() * 60
-- convert from nautical miles to miles
* 1.1515
AS distance
FROM starport
${wheres ? `WHERE ${wheres}` : ''}
ORDER BY distance ASC
LIMIT @limit
;
`,
		)
		.all(interpolations)
	assertArrayOfGeoResults(results)
	return results
}

export function getClosestCitiesByName({
	latitude,
	longitude,
	query,
	limit,
	exclude,
}: {
	latitude: number
	longitude: number
	query: string
	exclude: Array<string>
	limit: number
}) {
	const excludeInter = interpolateArray(exclude)
	const wheres = [
		query ? `(name LIKE @query OR country LIKE @query)` : null,
		exclude.length ? `id NOT IN (${excludeInter.query})` : null,
	]
		.filter(typedBoolean)
		.join(' AND ')
	const interpolations = {
		latitude,
		longitude,
		query: `%${query}%`,
		...excludeInter.interpolations,
		limit,
	}

	const results = db
		.prepare(
			/*sql*/ `
SELECT
id,
name,
country,
acos(
  sin(@latitude * PI()/180)
  * sin(latitude * PI()/180)
  + cos(@latitude * PI()/180)
  * cos(latitude * PI()/180)
  * cos((@longitude - longitude) * PI()/180)
)
* 180/PI() * 60
-- convert from nautical miles to miles
* 1.1515
AS distance
FROM city
${wheres ? `WHERE ${wheres}` : ''}
ORDER BY distance ASC
LIMIT @limit
;
`,
		)
		.all(interpolations)
	assertArrayOfGeoResults(results)
	return results
}

function interpolateArray(array: Array<string>) {
	const query = array.map((e, i) => `@array${i}`).join(',')
	const interpolations: Record<string, string> = {}
	for (let index = 0; index < array.length; index++) {
		interpolations[`array${index}`] = array[index]
	}
	return { query, interpolations }
}

type GeoResult = {
	id: string
	distance: number
}

function isGeoResult(obj: any): obj is GeoResult {
	return obj && typeof obj.id === 'string' && typeof obj.distance === 'number'
}

function assertArrayOfGeoResults(obj: any): asserts obj is Array<GeoResult> {
	if (!Array.isArray(obj) || !obj.every(isGeoResult)) {
		throw new Error('geo server did not return GeoResults')
	}
}

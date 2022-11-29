import { db } from '~/db.server'

export function getClosestStarport({
	latitude,
	longitude,
}: {
	latitude: number
	longitude: number
}) {
	const result = db
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
ORDER BY distance ASC
LIMIT 1
;
`,
		)

		.all({ latitude, longitude })
	const [row] = result
	if (!isStarportGeoResult(row)) return null
	return row
}

function isStarportGeoResult(
	obj: any,
): obj is { id: string; distance: number } {
	return obj && typeof obj.id === 'string' && typeof obj.distance === 'number'
}

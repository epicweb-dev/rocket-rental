import type { z } from 'zod'

export function parseSearchParams<SchemaType extends z.ZodRawShape>(
	sp: URLSearchParams,
	schema: z.ZodObject<SchemaType>,
) {
	const rawValues: Record<string, Array<string> | string> = {}
	const schemaProps = schema._def.shape()
	for (const key of sp.keys()) {
		const values = sp.getAll(key)
		const expectingArray = schemaProps[key]?._def.typeName === 'ZodArray'
		if (values.length === 1 && !expectingArray) {
			rawValues[key] = values[0]
		} else {
			rawValues[key] = values
		}
	}

	return schema.parse(rawValues)
}

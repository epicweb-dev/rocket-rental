import type { z } from 'zod'

export function parseSearchParams<SchemaType extends z.ZodRawShape>(
	sp: URLSearchParams,
	schema: z.ZodObject<SchemaType>,
) {
	const rawValues: Record<string, Array<string> | string> = {}
	const schemaProps = schema._def.shape()
	for (const key of sp.keys()) {
		const values = sp.getAll(key)
		const propSchema = schemaProps[key]
		if (propSchema && values.length === 1 && !isExpectingArray(propSchema)) {
			rawValues[key] = values[0]
		} else {
			rawValues[key] = values
		}
	}

	return schema.parse(rawValues)
}

function isExpectingArray(schema?: z.ZodTypeAny): boolean {
	if (!schema?._def) return false

	const { typeName } = schema._def
	if (typeName === 'ZodArray') return true
	if (['ZodUnion', 'ZodIntersection'].includes(typeName)) {
		return schema._def.options.some(isExpectingArray)
	}
	if (['ZodOptional', 'ZodNullable', 'ZodDefault'].includes(typeName)) {
		return isExpectingArray(schema._def.innerType)
	}
	if (typeName === 'ZodLazy') {
		return isExpectingArray(schema._def.getter())
	}
	return false
}

export function addParamToSet(
	searchParams: URLSearchParams,
	key: string,
	value: string,
) {
	const values = searchParams.getAll(key)
	if (!values.includes(value)) {
		searchParams.append(key, value)
	}
	return searchParams
}

export function unappend(
	searchParams: URLSearchParams,
	key: string,
	value: string,
) {
	const values = searchParams.getAll(key).filter(v => v !== value)
	searchParams.delete(key)
	for (const value of values) {
		searchParams.append(key, value)
	}
	return searchParams
}

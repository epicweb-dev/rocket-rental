import { z } from 'zod'
import { getSearchParamsOrFail } from './search-params'

test('getSearchParamsOrFail parses search params', () => {
	const searchParams = makeSearchParams({
		starportIds: ['123', '456'],
		hostIds: ['123'],
		capacityMin: '31',
		shipRatingMin: '4',
	})
	const result = getSearchParamsOrFail(
		searchParams,
		z.object({
			starportIds: z.array(z.string()).default([]),
			hostIds: z.array(z.string()).optional(),
			capacityMin: z.coerce.number().positive().optional(),
			shipRatingMin: z.coerce.number().min(0).max(5).optional(),
		}),
	)
	expect(result).toEqual({
		starportIds: ['123', '456'],
		hostIds: ['123'],
		capacityMin: 31,
		shipRatingMin: 4,
	})
})

test('getSearchParamsOrFail fails when multiple values and not expecting it', () => {
	expect(() =>
		getSearchParamsOrFail(
			makeSearchParams({ a: ['1', '2'] }),
			z.object({ a: z.string() }),
		),
	).toThrow(/invalid_type/)
})

test('getSearchParamsOrFail works', () => {
	getSearchParamsOrFail(
		makeSearchParams({ query: '', exclude: [] }),
		z.object({
			query: z.string().default(''),
			exclude: z.array(z.string()).default([]),
		}),
	)
})

test('getSearchParamsOrFail handles default values', () => {
	const NullableNumber = z
		.string()
		.nullable()
		.optional()
		.transform(s => {
			const number = s ? Number(s) : null
			return number === null || Number.isNaN(number) ? null : number
		})

	const SearchParamsSchema = z.object({
		query: z.string().default(''),
		lat: NullableNumber,
		long: NullableNumber,
		exclude: z.array(z.string()).default([]),
	})

	const results = getSearchParamsOrFail(
		new URLSearchParams(),
		SearchParamsSchema,
	)
	expect(results).toEqual({
		query: '',
		lat: null,
		long: null,
		exclude: [],
	})
})

function makeSearchParams(obj: Record<string, string | Array<string>>) {
	const sp = new URLSearchParams()
	for (const [key, values] of Object.entries(obj)) {
		if (Array.isArray(values)) {
			values.forEach(value => sp.append(key, value))
		} else {
			sp.append(key, values)
		}
	}
	return sp
}

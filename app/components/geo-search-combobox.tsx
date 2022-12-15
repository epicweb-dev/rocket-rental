import { z } from 'zod'
import { SearchCombobox } from './search-combobox'

export type GeoItem = {
	id: string
	displayName: string
	distance: number | null
}

export type BaseOptions = {
	exclude: Array<string>
	geolocation: { lat: number; long: number } | null
	onChange: (selectedHost: GeoItem | null | undefined) => void
}

const NullableNumber = z
	.string()
	.nullable()
	.optional()
	.transform(s => {
		const number = s ? Number(s) : null
		return number === null || Number.isNaN(number) ? null : number
	})

export const SearchParamsSchema = z.object({
	query: z.string().default(''),
	lat: NullableNumber,
	long: NullableNumber,
	exclude: z.array(z.string()).default([]),
})

export function GeoSearchCombobox({
	geolocation,
	...props
}: BaseOptions & {
	label: string
	resourceUrl: string
}) {
	return (
		<SearchCombobox
			{...props}
			itemToKey={item => item.id}
			itemToString={item => item?.displayName ?? ''}
			additionalSearchParams={
				geolocation
					? {
							lat: geolocation.lat.toString(),
							long: geolocation.long.toString(),
					  }
					: null
			}
			renderItemInList={item => (
				<>
					{item.displayName}{' '}
					{item.distance ? `(${item.distance.toFixed(2)}mi)` : null}
				</>
			)}
		/>
	)
}

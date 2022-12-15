import type { SearchComboboxProps } from './search-combobox'
import { SearchCombobox } from './search-combobox'

export type BaseOptions<Item> = Pick<
	SearchComboboxProps<Item>,
	'exclude' | 'onChange'
>

export { SearchParamsSchema } from './search-combobox'

export function BasicSearchCombobox<Item>(
	props: Omit<SearchComboboxProps<Item>, 'additionalSearchParams'>,
) {
	return <SearchCombobox {...props} />
}

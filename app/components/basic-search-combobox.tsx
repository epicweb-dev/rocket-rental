import { type SearchComboboxProps } from './search-combobox'

export type BaseOptions<Item> = Pick<
	SearchComboboxProps<Item>,
	'selectedItem' | 'exclude' | 'onChange' | 'placeholder'
>

export {
	SearchParamsSchema,
	SearchCombobox as BasicSearchCombobox,
} from './search-combobox'

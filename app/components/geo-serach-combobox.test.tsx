import { unstable_createRemixStub as createRemixStub } from '@remix-run/testing'
import { render, screen } from '@testing-library/react'
import { test } from 'vitest'
import { GeoSearchCombobox } from './geo-search-combobox'

test('renders', async () => {
	const handleChange = vi.fn()

	const RemixStub = createRemixStub([
		{
			id: 'root',
			path: '/',
			element: (
				<GeoSearchCombobox
					geolocation={{ lat: 12, long: 13 }}
					label="Starports"
					onChange={handleChange}
					resourceUrl="/resources/mock-geo-search"
					exclude={['a', 'b']}
					selectedItem={{ id: 'c', displayName: 'C' }}
				/>
			),
		},
		{
			id: 'mock-geo-search',
			path: '/resources/mock-geo-search',
			loader() {
				return [
					{
						id: 'c',
						displayName: 'C',
					},
					{
						id: 'd',
						displayName: 'D',
					},
				]
			},
		},
	])

	render(<RemixStub />)
	await screen.findByRole('status')
})

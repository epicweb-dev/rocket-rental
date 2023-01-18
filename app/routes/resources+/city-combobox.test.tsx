import { type City } from '@prisma/client'
import { unstable_createRemixStub as createRemixStub } from '@remix-run/testing'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as React from 'react'
import { test } from 'vitest'
import { db } from '~/utils/db.server'
import { CityCombobox, loader } from './city-combobox'

test('renders', async () => {
	const handleChange = vi.fn()

	const insert = db.prepare(/*sql*/ `
INSERT INTO city (id, name, country, latitude, longitude, updatedAt, createdAt)
VALUES (@id, @name, @country, @latitude, @longitude, datetime('now'), datetime('now'))
	`)

	const insertCities = db.transaction(cities => {
		for (const city of cities) insert.run(city)
	})

	insertCities([
		{
			id: '123',
			name: 'Salt Lake City',
			country: 'US',
			latitude: -111.9905245,
			longitude: 40.7765868,
		},
		{
			id: '456',
			name: 'London',
			country: 'UK',
			latitude: -0.3886621,
			longitude: 51.5282914,
		},
	] satisfies Array<Omit<City, 'createdAt' | 'updatedAt'>>)

	type Geo = { lat: number; long: number } | null
	type Exclude = Array<string>
	let setGeolocation: (geo: Geo) => void = () => {}
	let setExclude: (exclude: Exclude) => void = () => {}

	function App() {
		const gState = React.useState<Geo>(null)
		const eState = React.useState<Exclude>()
		setGeolocation = gState[1]
		setExclude = eState[1]

		return (
			<CityCombobox
				geolocation={gState[0]}
				exclude={eState[0]}
				onChange={handleChange}
			/>
		)
	}

	const RemixStub = createRemixStub([
		{
			id: 'root',
			path: '/',
			element: <App />,
		},
		{
			id: 'resources-city-combobox',
			path: '/resources/city-combobox',
			loader: async args => {
				const response = await loader(args as any)
				const json = await response.json()
				return json
			},
		},
	])

	render(<RemixStub />)

	// wait for the accessibility status node to show up
	await screen.findByRole('status')

	const combobox = screen.getByRole('combobox', { name: /City/ })
	await userEvent.type(combobox, 'S')

	await userEvent.click(await screen.findByRole('option', { name: /Salt/ }))
	expect(combobox).toHaveValue('Salt Lake City, US')
	await userEvent.clear(combobox)
	await userEvent.type(combobox, 'NO_MATCH')
	expect(screen.queryByRole('option')).not.toBeInTheDocument()
	expect(combobox).toHaveValue('NO_MATCH')
	await userEvent.clear(combobox)

	act(() => setGeolocation({ lat: 1, long: 50 }))

	await userEvent.type(combobox, 'L')

	const options = await screen.findAllByRole('option')
	expect(options).toHaveLength(2)
	expect(options.map(o => o.textContent)).toEqual([
		'London, UK (142.67mi)',
		'Salt Lake City, US (7785.72mi)',
	])

	await userEvent.click(await screen.findByRole('option', { name: /Salt/ }))
	expect(combobox).toHaveValue('Salt Lake City, US')
	await userEvent.clear(combobox)

	act(() => {
		setExclude(['123'])
		setGeolocation({ lat: -111, long: 60 })
	})
	await userEvent.type(combobox, 'L')

	const options2 = await screen.findAllByRole('option')
	expect(options2).toHaveLength(1)
	expect(options2.map(o => o.textContent)).toEqual(['London, UK (7625.61mi)'])
})

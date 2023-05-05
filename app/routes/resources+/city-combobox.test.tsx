import { type City } from '@prisma/client'
import { unstable_createRemixStub as createRemixStub } from '@remix-run/testing'
import { act, render, screen } from '@testing-library/react'
import { userEvent } from './user-event.cjs'
import * as React from 'react'
import { test } from 'vitest'
import { db } from '~/utils/db.server.ts'
import { CityCombobox, loader } from './city-combobox.tsx'

test('allows you to search for cities in the database', async () => {
	const insert = db.prepare(/*sql*/ `
INSERT INTO city (id, name, country, latitude, longitude, updatedAt, createdAt)
VALUES (@id, @name, @country, @latitude, @longitude, datetime('now'), datetime('now'))
	`)

	const insertCities = db.transaction(cities => {
		for (const city of cities) insert.run(city)
	})

	const slc = {
		id: '123',
		name: 'Salt Lake City',
		country: 'US',
		displayName: 'Salt Lake City, US',
		latitude: -111.9905245,
		longitude: 40.7765868,
	} as const
	const london = {
		id: '456',
		name: 'London',
		country: 'UK',
		displayName: 'London, UK',
		latitude: -0.3886621,
		longitude: 51.5282914,
	} as const

	insertCities([slc, london] satisfies Array<
		Omit<City, 'createdAt' | 'updatedAt'>
	>)

	type Geo = { lat: number; long: number } | null
	type Exclude = Array<string>
	let setGeolocation: (geo: Geo) => void = () => {}
	let setExclude: (exclude: Exclude) => void = () => {}

	const handleChange = vi.fn()

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
			loader,
		},
	])

	render(<RemixStub />)

	const combobox = screen.getByRole('combobox', { name: /City/ })

	// find and select a single result without geolocation
	await userEvent.type(combobox, 'S')
	let options = await screen.findAllByRole('option')
	expect(options).toHaveLength(1)
	expect(options[0]).toHaveAccessibleName(slc.displayName)
	await userEvent.click(options[0])
	expect(combobox).toHaveValue(slc.displayName)
	expect(handleChange).toHaveBeenCalledOnce()
	expect(handleChange).toHaveBeenCalledWith({
		displayName: slc.displayName,
		id: slc.id,
		distance: null,
	})

	await userEvent.clear(combobox)
	handleChange.mockClear()

	// search for a city that doesn't exist
	await userEvent.type(combobox, 'NO_MATCH')
	expect(screen.queryByRole('option')).not.toBeInTheDocument()
	expect(combobox).toHaveValue('NO_MATCH')

	await userEvent.clear(combobox)
	// set geolocation data
	act(() => setGeolocation({ lat: slc.latitude - 1, long: slc.longitude + 1 }))

	// search for multiple options
	await userEvent.type(combobox, 'L')
	options = await screen.findAllByRole('option')
	expect(options).toHaveLength(2)
	// the first option should be the closest city
	expect(options[0]).toHaveAccessibleName(`${slc.displayName} 73.97mi`)
	expect(options[1]).toHaveAccessibleName(`${london.displayName} 7755.50mi`)

	await userEvent.click(options[1])
	expect(combobox).toHaveValue(london.displayName)
	expect(handleChange).toHaveBeenCalledOnce()
	expect(handleChange).toHaveBeenCalledWith({
		displayName: london.displayName,
		id: london.id,
		distance: 7755.5,
	})

	await userEvent.clear(combobox)

	// exclude a city
	act(() => {
		setExclude([london.id])
		setGeolocation({ lat: london.latitude + 1, long: london.longitude - 1 })
	})

	// search for something that matches both cities
	await userEvent.type(combobox, 'L')

	options = await screen.findAllByRole('option')
	expect(options).toHaveLength(1)
	expect(options[0]).toHaveAccessibleName(`${slc.displayName} 7756.49mi`)
})

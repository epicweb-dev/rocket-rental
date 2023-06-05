import { differenceInDays } from 'date-fns'
import {
	createBrand,
	createShip,
	createShipModel,
	createStarport,
	createUser,
	getImagePath,
	oneDay,
} from 'tests/db-utils.ts'
import {
	BASE_URL,
	createImageFromFile,
	insertImage,
} from 'tests/vitest-utils.ts'
import { expect, test } from 'vitest'
import { bookingSessionKey } from '~/routes/resources+/booker.tsx'
import { prisma } from '~/utils/db.server.ts'
import { commitSession, getSession } from '~/utils/session.server.ts'
import { loader } from './$shipId.book.tsx'

test('requires authenticated user', async () => {
	const params = { shipId: '123' }
	const request = new Request(`${BASE_URL}/ships/${params.shipId}/book`)
	const response = await loader({
		request,
		params,
		context: {},
	}).catch(r => r)
	expect(response.headers.get('Location')).toBe(`/ships/${params.shipId}`)
})

test('returns booking data from the session', async () => {
	const brandImageId = await insertImage(getImagePath('ship-brand'))
	const starportImageId = await insertImage(getImagePath('starport'))
	const ship = await prisma.ship.create({
		data: {
			...createShip(),
			model: {
				create: {
					...createShipModel(),
					image: {
						create: await createImageFromFile(getImagePath('ship-model')),
					},
					brand: {
						create: { ...createBrand(), imageId: brandImageId },
					},
				},
			},
			host: { create: { user: { create: createUser() } } },
			starport: { create: { ...createStarport(), imageId: starportImageId } },
		},
	})
	const startDate = new Date(Date.now() + oneDay)
	const endDate = new Date(Date.now() + oneDay * 2)
	const totalPrice = differenceInDays(endDate, startDate) * ship.dailyCharge
	const bookingData = {
		shipId: ship.id,
		startDate,
		endDate,
	}
	const params = { shipId: ship.id }
	const request = new Request(`${BASE_URL}/ships/${params.shipId}/book`, {
		headers: { cookie: await getBookingCookie(bookingData) },
	})
	const response = await loader({
		request,
		params,
		context: {},
	})

	const json = await response.json()

	expect(json).toEqual({
		endDate: endDate.toISOString(),
		shipId: ship.id,
		startDate: startDate.toISOString(),
		totalPrice,
	})
})

async function getBookingCookie(bookingData: any, existingCookie?: string) {
	const session = await getSession(existingCookie)
	session.set(bookingSessionKey, bookingData)
	const cookie = await commitSession(session)
	return cookie
}

import { differenceInDays } from 'date-fns'
import {
	createShip,
	createStarport,
	createUser,
	oneDay,
	createShipModel,
	createBrand,
	insertImage,
	lockifyFakerImage,
	downloadFile,
} from 'prisma/seed-utils'
import { BASE_URL } from 'test/utils'
import { test } from 'vitest'
import { prisma } from '~/utils/db.server'
import { commitSession, getSession } from '~/utils/session.server'
import { bookingSessionKey } from '~/routes/resources+/booker'
import { loader } from './$shipId.book'
import { faker } from '@faker-js/faker'

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
	const brandImageId = await insertImage(
		prisma,
		lockifyFakerImage(faker.image.nature(512, 512, true)),
	)
	const starportImageId = await insertImage(
		prisma,
		lockifyFakerImage(faker.image.nightlife(512, 512, true)),
	)
	const ship = await prisma.ship.create({
		data: {
			...createShip(),
			model: {
				create: {
					...createShipModel(),
					image: {
						create: {
							contentType: 'image/jpeg',
							file: {
								create: {
									blob: await downloadFile(
										lockifyFakerImage(faker.image.business(512, 512, true)),
									),
								},
							},
						},
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

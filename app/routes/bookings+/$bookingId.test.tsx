import { faker } from '@faker-js/faker'
import {
	createBooking,
	createBrand,
	createShip,
	createShipModel,
	createStarport,
	createUser,
	insertImage,
	lockifyFakerImage,
	oneDay,
} from 'prisma/seed-utils'
import { BASE_URL, getUserSetCookieHeader } from 'tests/vitest-utils'
import invariant from 'tiny-invariant'
import { test } from 'vitest'
import { prisma } from '~/utils/db.server'
import { loader } from './$bookingId'

test('requires authenticated user', async () => {
	const params = { bookingId: '123' }
	const request = new Request(`${BASE_URL}/bookings/${params.bookingId}`)
	const response = await loader({
		request,
		params,
		context: {},
	}).catch(r => r)
	expect(response.headers.get('Location')).toMatch(/\/login/)
})

test('returns 404 for booking that does not exist', async () => {
	const cookie = await getUserSetCookieHeader(
		await prisma.user.create({ data: createUser() }),
	)
	const params = { bookingId: 'does-not-exist' }
	const request = new Request(`${BASE_URL}/bookings/${params.bookingId}`, {
		headers: { cookie },
	})
	const response = await loader({
		request,
		params,
		context: {},
	}).catch(r => r)
	expect(response.status).toBe(404)
})

test('returns 404 for a booking that does not involve the user', async () => {
	const { params } = await setupBooking()
	const cookie = await getUserSetCookieHeader(
		await prisma.user.create({ data: createUser() }),
	)
	const request = new Request(`${BASE_URL}/bookings/${params.bookingId}`, {
		headers: { cookie },
	})
	const response = await loader({
		request,
		params,
		context: {},
	}).catch(r => r)
	expect(response.status).toBe(404)
})

test('a booking over two weeks in the past cannot be reviewed', async () => {
	const { booking, params, request } = await setupBooking({
		start: new Date(Date.now() - oneDay * 30),
		end: new Date(Date.now() - oneDay * 14),
	})
	const response = await loader({
		request,
		params,
		context: {},
	})
	expect(response.status).toBe(200)
	const json = await response.json()
	expect(json).toMatchObject(
		expect.objectContaining({
			canReview: false,
			booking: expect.objectContaining({ id: booking.id }),
		}),
	)
})

test('a booking ending within two weeks can be reviewed', async () => {
	const { booking, params, request } = await setupBooking({
		start: new Date(Date.now() - oneDay * 13),
		end: new Date(Date.now() - oneDay * 2),
	})
	const response = await loader({
		request,
		params,
		context: {},
	})
	expect(response.status).toBe(200)
	const json = await response.json()
	expect(json).toMatchObject(
		expect.objectContaining({
			canReview: true,
			booking: expect.objectContaining({ id: booking.id }),
		}),
	)
})

test('an ongoing booking cannot be reviewed', async () => {
	const { booking, params, request } = await setupBooking({
		start: new Date(Date.now() - oneDay),
		end: new Date(Date.now() + oneDay * 2),
	})
	const response = await loader({
		request,
		params,
		context: {},
	})
	expect(response.status).toBe(200)
	const json = await response.json()
	expect(json).toMatchObject(
		expect.objectContaining({
			canReview: false,
			booking: expect.objectContaining({ id: booking.id }),
		}),
	)
})

async function setupBooking({
	start = new Date(Date.now() - oneDay * 10),
	end = new Date(Date.now() + oneDay * 10),
}: {
	start?: Date
	end?: Date
} = {}) {
	const user = await prisma.user.create({
		data: {
			...createUser(),
			renter: {
				create: {},
			},
		},
	})
	const cookie = await getUserSetCookieHeader(user)
	const shipData = createShip()
	const shipModelImageId = await insertImage(
		prisma,
		lockifyFakerImage(faker.image.transport(512, 512, true)),
	)
	const brandImageId = await insertImage(
		prisma,
		lockifyFakerImage(faker.image.nature(512, 512, true)),
	)
	const starportImageId = await insertImage(
		prisma,
		lockifyFakerImage(faker.image.business(512, 512, true)),
	)
	const shipBrand = await prisma.shipBrand.create({
		data: {
			...createBrand(),
			imageId: brandImageId,
		},
	})
	const hostUser = await prisma.user.create({
		data: {
			...createUser(),
			host: {
				create: {
					ships: {
						create: [
							{
								model: {
									create: {
										...createShipModel(),
										imageId: shipModelImageId,
										brandId: shipBrand.id,
									},
								},
								starport: {
									create: { ...createStarport(), imageId: starportImageId },
								},
								...shipData,
								bookings: {
									create: [
										{
											renterId: user.id,
											...createBooking({
												dailyCharge: shipData.dailyCharge,
												start,
												end,
											}),
										},
									],
								},
							},
						],
					},
				},
			},
		},
		select: {
			host: {
				select: {
					ships: {
						select: {
							bookings: {
								select: { id: true },
							},
						},
					},
				},
			},
		},
	})

	const booking = hostUser.host?.ships[0].bookings[0]
	invariant(booking, 'Booking not created properly')
	const params = { bookingId: booking.id }
	const request = new Request(`${BASE_URL}/bookings/${params.bookingId}`, {
		headers: { cookie },
	})
	return { booking, params, request }
}

// 1. Booking in the past
// 2. Booking happening now
// 3. Booking in the future

// All of the above as
// 1. renter
// 2. host

// All of the above with reviews:
// 1. host, renter, ship
// 2. host, renter
// 3. host, ship
// 4. renter, ship
// 5. host
// 6. renter
// 7. ship
// 8. none

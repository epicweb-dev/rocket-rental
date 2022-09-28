import type * as P from '@prisma/client'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { faker } from '@faker-js/faker'
import {
	createContactInfo,
	createDateRange,
	createUser,
	oneDay,
	typedBoolean,
} from './seed-utils'

const prisma = new PrismaClient()

async function seed() {
	const email = 'kody@kcd.dev'

	// cleanup the existing database
	await prisma.user.deleteMany({ where: {} })
	await prisma.ship.deleteMany({ where: {} })
	await prisma.shipBrand.deleteMany({ where: {} })
	await prisma.starport.deleteMany({ where: {} })

	const hashedPassword = await bcrypt.hash('kodylovesyou', 10)

	const brands = await Promise.all(
		Array.from({ length: 10 }, async () => {
			const brand = await prisma.shipBrand.create({
				data: {
					name: faker.company.name(),
					description: faker.company.bs(),
					imageUrl: faker.image.nature(512, 512, true),
				},
			})
			return brand
		}),
	)

	const starports = await Promise.all(
		Array.from({ length: 30 }, async () => {
			const starport = await prisma.starport.create({
				data: {
					name: faker.company.name(),
					description: faker.lorem.sentences(3),
					imageUrl: faker.image.business(512, 512, true),
					latitude: Number(faker.address.latitude()),
					longitude: Number(faker.address.longitude()),
				},
			})
			return starport
		}),
	)

	// hosts with ships and reviews
	// renters with bookings and reviews
	// hosts who are renters also
	const users = await Promise.all(
		Array.from({ length: 100 }, async () => {
			const userData = createUser()
			const user = await prisma.user.create({
				data: {
					...userData,
					contactInfo: {
						create: createContactInfo(),
					},
					password: {
						create: {
							hash: bcrypt.hashSync(userData.username.toUpperCase(), 10),
						},
					},
				},
			})
			return user
		}),
	)

	const adminIds = users.slice(0, 10).map(user => user.id)
	const admins = await Promise.all(
		adminIds.map(async id => {
			const admin = await prisma.admin.create({
				data: {
					userId: id,
				},
			})
			return admin
		}),
	)

	const hostIds = users.slice(10, 50).map(user => user.id)
	const hosts = await Promise.all(
		hostIds.map(async (id, index) => {
			const shipCount = faker.datatype.number({ min: 1, max: 5 })

			const host = await prisma.host.create({
				data: {
					userId: id,
					bio: faker.lorem.sentences(3),
					ships: {
						create: Array.from(
							{ length: shipCount },
							(): Omit<P.Ship, 'id' | 'createdAt' | 'updatedAt' | 'hostId'> => {
								return {
									brandId: faker.helpers.arrayElement(brands).id,
									starportId: faker.helpers.arrayElement(starports).id,
									name: faker.lorem.word(),
									capacity: faker.datatype.number({ min: 1, max: 10 }),
									description: faker.lorem.sentences(3),
									imageUrl: faker.image.transport(512, 512, true),
									dailyCharge: faker.datatype.number({ min: 100, max: 1000 }),
								}
							},
						),
					},
				},
				include: {
					ships: true,
				},
			})
			return host
		}),
	)

	const renterIds = users.slice(40).map(user => user.id)
	const renters = await Promise.all(
		renterIds.map(async id => {
			const renter = await prisma.renter.create({
				data: {
					userId: id,
					bio: faker.lorem.sentences(3),
				},
			})
			return renter
		}),
	)

	const rentersWithBookings = faker.helpers.arrayElements(renters, 20)
	const shipsWithBookings = faker.helpers.arrayElements(
		hosts.flatMap(host => host.ships),
		30,
	)

	const bookings = await Promise.all(
		shipsWithBookings.map(async (ship, index) => {
			const hasPastBooking = faker.datatype.boolean()
			const hasPresentBooking = faker.datatype.boolean()
			const hasFutureBooking = faker.datatype.boolean()
			const dates = [
				hasPastBooking && {
					start: new Date(Date.now() - oneDay * 30),
					end: new Date(Date.now() - oneDay * 2),
					renter: rentersWithBookings[index % rentersWithBookings.length],
				},
				hasPresentBooking && {
					start: new Date(Date.now() - oneDay * 2),
					end: new Date(Date.now() + oneDay * 2),
					renter: rentersWithBookings[(index + 1) % rentersWithBookings.length],
				},
				hasFutureBooking && {
					start: new Date(Date.now() + oneDay * 2),
					end: new Date(Date.now() + oneDay * 30),
					renter: rentersWithBookings[(index + 2) % rentersWithBookings.length],
				},
			].filter(typedBoolean)

			const bookings = await Promise.all(
				dates.map(async ({ start, end, renter }) => {
					const { startDate, endDate } = createDateRange({
						start,
						end,
						maxDays: 10,
					})
					const days = Math.ceil(
						(endDate.getTime() - startDate.getTime()) / oneDay,
					)

					const createdAt = faker.date.between(
						startDate.getTime() - oneDay * 10,
						startDate.getTime() - oneDay,
					)
					const booking = await prisma.booking.create({
						data: {
							createdAt,
							updatedAt: createdAt,
							renterId: renter.userId,
							shipId: ship.id,
							startDate,
							endDate,
							totalPrice: days * ship.dailyCharge,
						},
						include: {
							ship: true,
						},
					})
					return booking
				}),
			)

			return bookings
		}),
	).then(bookings => bookings.flat())

	const pastBookings = bookings.filter(booking => booking.endDate < new Date())
	const reviews = await Promise.all(
		pastBookings.map(async booking => {
			const createdAt = new Date(booking.endDate.getTime() + oneDay)
			const shipReview = await prisma.shipReview.create({
				data: {
					shipId: booking.shipId,
					renterId: booking.renterId,
					rating: faker.datatype.number({ min: 1, max: 5 }),
					description: faker.lorem.sentences(3),
					createdAt,
					updatedAt: createdAt,
				},
			})
			const hostReview = await prisma.hostReview.create({
				data: {
					hostId: booking.ship.hostId,
					renterId: booking.renterId,
					rating: faker.datatype.number({ min: 1, max: 5 }),
					description: faker.lorem.sentences(3),
					createdAt,
					updatedAt: createdAt,
				},
			})
			const renterReview = await prisma.renterReview.create({
				data: {
					renterId: booking.renterId,
					hostId: booking.ship.hostId,
					rating: faker.datatype.number({ min: 1, max: 5 }),
					description: faker.lorem.sentences(3),
					createdAt,
					updatedAt: createdAt,
				},
			})
			return [shipReview, hostReview, renterReview]
		}),
	).then(reviews => reviews.flat())

	const chats = await Promise.all(
		bookings.map(async booking => {
			const createdAt = faker.date.between(
				booking.createdAt.getTime() - oneDay,
				booking.createdAt.getTime() + oneDay,
			)
			const chat = await prisma.chat.create({
				data: {
					users: {
						connect: [{ id: booking.ship.hostId }, { id: booking.renterId }],
					},
					createdAt,
					messages: {
						create: Array.from(
							{ length: faker.datatype.number({ min: 1, max: 10 }) },
							(_, index): Omit<P.Message, 'id' | 'chatId'> => {
								const sentAt = new Date(createdAt.getTime() + 1000 * 3 * index)
								return {
									createdAt: sentAt,
									updatedAt: sentAt,
									senderId: faker.datatype.boolean()
										? booking.renterId
										: booking.ship.hostId,
									content: faker.lorem.sentences(
										faker.datatype.number({ min: 1, max: 3 }),
									),
								}
							},
						),
					},
				},
			})

			return chat
		}),
	)

	const kodyUser = createUser()

	await prisma.user.create({
		data: {
			email,
			username: 'kody',
			name: 'Kody',
			imageUrl: kodyUser.imageUrl,
			password: {
				create: {
					hash: hashedPassword,
				},
			},
			admin: {
				create: {},
			},
		},
	})

	console.log(`Database has been seeded. 🌱`)
}

seed()
	.catch(e => {
		console.error(e)
		process.exit(1)
	})
	.finally(async () => {
		await prisma.$disconnect()
	})

/*
eslint
	@typescript-eslint/no-unused-vars: "off",
*/

import type * as P from '@prisma/client'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { faker } from '@faker-js/faker'
import {
	createBooking,
	createBrand,
	createContactInfo,
	createPassword,
	createShip,
	createShipModel,
	createStarport,
	createUser,
	downloadFile,
	insertImage,
	lockifyFakerImage,
	oneDay,
} from './seed-utils'
import allTheCities from 'all-the-cities'
import { typedBoolean } from '~/utils/misc'

const prisma = new PrismaClient()

async function seed() {
	console.log('🌱 Seeding...')
	console.time(`🌱 Database has been seeded`)

	console.time('🧹 Cleaned up the database...')
	await prisma.user.deleteMany({ where: {} })
	await prisma.ship.deleteMany({ where: {} })
	await prisma.shipBrand.deleteMany({ where: {} })
	await prisma.starport.deleteMany({ where: {} })
	await prisma.booking.deleteMany({ where: {} })
	await prisma.chat.deleteMany({ where: {} })
	await prisma.city.deleteMany({ where: {} })
	console.timeEnd('🧹 Cleaned up the database...')

	const citiesToCreate = allTheCities
		.filter(c => c.population > 75_000)
		.sort((a, z) => z.population - a.population)

	console.time(`🌃 Created ${citiesToCreate.length} cities...`)
	for (const city of citiesToCreate) {
		await prisma.city.create({
			data: {
				name: city.name,
				country: city.country,
				longitude: city.loc.coordinates[0],
				latitude: city.loc.coordinates[1],
			},
		})
	}
	console.timeEnd(`🌃 Created ${citiesToCreate.length} cities...`)

	const totalBrands = 5
	console.time(`✅ Created ${totalBrands} brands...`)
	const brands = await Promise.all(
		Array.from({ length: totalBrands }, async () => {
			const brand = await prisma.shipBrand.create({
				data: {
					...createBrand(),
					image: {
						create: {
							contentType: 'image/jpeg',
							file: {
								create: {
									blob: await downloadFile(
										lockifyFakerImage(faker.image.nature(512, 512, true)),
									),
								},
							},
						},
					},
				},
			})
			return brand
		}),
	)
	console.timeEnd(`✅ Created ${totalBrands} brands...`)

	const totalShipModels = 30
	console.time(`⭐ Created ${totalShipModels} ship models...`)
	const shipModels = await Promise.all(
		Array.from({ length: totalShipModels }, async () => {
			const imageId = await insertImage(
				prisma,
				lockifyFakerImage(faker.image.business(512, 512, true)),
			)

			const shipModel = await prisma.shipModel.create({
				data: {
					brandId: faker.helpers.arrayElement(brands).id,
					...createShipModel(),
					imageId,
				},
			})
			return shipModel
		}),
	)
	console.timeEnd(`⭐ Created ${totalShipModels} ship models...`)

	const totalStarports = 80
	console.time(`🏢 Created ${totalStarports} starports...`)
	const starports = await Promise.all(
		Array.from({ length: totalStarports }, async (_, index) => {
			const city: (typeof citiesToCreate)[number] = citiesToCreate[index]
			const starport = await prisma.starport.create({
				data: {
					...createStarport(),
					longitude: city.loc.coordinates[0],
					latitude: city.loc.coordinates[1],
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
				},
			})
			return starport
		}),
	)
	console.timeEnd(`🏢 Created ${totalStarports} starports...`)

	// hosts with ships and reviews
	// renters with bookings and reviews
	// hosts who are renters also
	const totalUsers = 40
	console.time(`👤 Created ${totalUsers} users...`)
	const users = await Promise.all(
		Array.from({ length: totalUsers }, async () => {
			const gender = faker.helpers.arrayElement(['female', 'male']) as
				| 'female'
				| 'male'
			const userData = createUser({ gender })
			const imageGender = gender === 'female' ? 'women' : 'men'
			const imageNumber = faker.datatype.number({ min: 0, max: 99 })
			const user = await prisma.user.create({
				data: {
					...userData,
					contactInfo: {
						create: createContactInfo(),
					},
					password: {
						create: createPassword(userData.username),
					},
					image: {
						create: {
							contentType: 'image/jpeg',
							file: {
								create: {
									blob: await downloadFile(
										`https://randomuser.me/api/portraits/${imageGender}/${imageNumber}.jpg`,
									),
								},
							},
						},
					},
				},
			})
			return user
		}),
	)
	console.timeEnd(`👤 Created ${totalUsers} users...`)

	const totalAdmins = Math.floor(totalUsers * 0.1)

	console.time(`👮 Created ${totalAdmins} admins...`)
	const adminIds = users.slice(0, totalAdmins).map(user => user.id)
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
	console.timeEnd(`👮 Created ${totalAdmins} admins...`)

	const totalHosts = Math.floor(totalUsers * 0.3)

	console.time(`🥳 Created ${totalHosts} hosts...`)
	const hostIds = users
		.slice(totalAdmins, totalAdmins + totalHosts)
		.map(user => user.id)
	const hosts = await Promise.all(
		hostIds.map(async id => {
			const shipCount = faker.datatype.number({ min: 1, max: 15 })

			const imageIds = await Promise.all(
				Array.from({ length: shipCount }, () =>
					insertImage(
						prisma,
						lockifyFakerImage(faker.image.transport(512, 512, true)),
					),
				),
			)

			const host = await prisma.host.create({
				data: {
					userId: id,
					bio: faker.lorem.sentences(3),
					ships: {
						create: await Promise.all(
							Array.from({ length: shipCount }, async (_, index) => {
								return {
									modelId: faker.helpers.arrayElement(shipModels).id,
									starportId: faker.helpers.arrayElement(starports).id,
									...createShip(),
									imageId: imageIds[index],
								}
							}),
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
	console.timeEnd(`🥳 Created ${totalHosts} hosts...`)

	const totalRenters = Math.floor(
		totalUsers - totalAdmins - totalHosts + totalHosts * 0.6,
	)

	console.time(`😍 Created ${totalRenters} renters...`)
	const renterIds = users.slice(totalUsers - totalRenters).map(user => user.id)
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
	console.timeEnd(`😍 Created ${totalRenters} renters...`)

	console.time('📚 Created bookings...')
	const rentersWithBookings = faker.helpers.arrayElements(renters, 20)
	const shipsWithBookings = faker.helpers.arrayElements(
		hosts.flatMap(host => host.ships),
		30,
	)

	const bookings = await Promise.all(
		shipsWithBookings.map(async (ship, index) => {
			const hasPastBooking = Math.random() > 0.1
			const hasPresentBooking = Math.random() > 0.1
			const hasFutureBooking = Math.random() > 0.1
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
					const booking = await prisma.booking.create({
						data: {
							renterId: renter.userId,
							shipId: ship.id,
							...createBooking({ start, end, dailyCharge: ship.dailyCharge }),
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
	console.timeEnd('📚 Created bookings...')

	console.time('📝 Created reviews...')
	const pastBookings = bookings.filter(booking => booking.endDate < new Date())
	const reviews = await Promise.all(
		pastBookings.map(async booking => {
			const createdAt = new Date(booking.endDate.getTime() + oneDay)
			const shipReview =
				Math.random() > 0.05
					? await prisma.shipReview.create({
							data: {
								subjectId: booking.shipId,
								reviewerId: booking.renterId,
								rating: faker.datatype.number({ min: 1, max: 5 }),
								content: faker.lorem.sentences(3),
								createdAt,
								updatedAt: createdAt,
								bookingId: booking.id,
							},
					  })
					: null
			const hostReview =
				Math.random() > 0.05
					? await prisma.hostReview.create({
							data: {
								subjectId: booking.ship.hostId,
								reviewerId: booking.renterId,
								rating: faker.datatype.number({ min: 1, max: 5 }),
								content: faker.lorem.sentences(3),
								createdAt,
								updatedAt: createdAt,
								bookingId: booking.id,
							},
					  })
					: null
			const renterReview =
				Math.random() > 0.05
					? await prisma.renterReview.create({
							data: {
								subjectId: booking.renterId,
								reviewerId: booking.ship.hostId,
								rating: faker.datatype.number({ min: 1, max: 5 }),
								content: faker.lorem.sentences(3),
								createdAt,
								updatedAt: createdAt,
								bookingId: booking.id,
							},
					  })
					: null
			return [shipReview, hostReview, renterReview]
		}),
	).then(reviews => reviews.flat())
	console.timeEnd('📝 Created reviews...')

	console.time('💬 Created chats...')
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
	console.timeEnd('💬 Created chats...')

	const kodyUser = createUser()

	await prisma.user.create({
		data: {
			email: 'kody@kcd.dev',
			username: 'kody',
			name: 'Kody',
			image: {
				create: {
					contentType: 'image/png',
					file: {
						create: {
							blob: await downloadFile(
								`https://res.cloudinary.com/kentcdodds-com/image/upload/kentcdodds.com/misc/kody.png`,
							),
						},
					},
				},
			},
			password: {
				create: {
					hash: await bcrypt.hash('kodylovesyou', 10),
				},
			},
			admin: {
				create: {},
			},
		},
	})

	console.timeEnd(`🌱 Database has been seeded`)
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

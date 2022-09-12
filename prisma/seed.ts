import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function seed() {
	const email = 'kody@kcd.dev'

	// cleanup the existing database
	await prisma.user.deleteMany({ where: {} })
	await prisma.ship.deleteMany({ where: {} })
	await prisma.shipBrand.deleteMany({ where: {} })
	await prisma.starport.deleteMany({ where: {} })

	const hashedPassword = await bcrypt.hash('kodylovesyou', 10)

	const brand = await prisma.shipBrand.create({
		data: {
			name: 'Starstruck',
			description: 'The best ships in the galaxy',
			imageUrl: '/img/brands/starstruck.png',
		},
	})

	const starport = await prisma.starport.create({
		data: {
			name: 'Salt Lake City',
			description:
				'Enjoy the beautiful mountains before blasting off into space',
			imageUrl: '/img/starports/slc.png',
			latitude: 40.78892604728954,
			longitude: -111.98025442861417,
		},
	})

	await prisma.user.create({
		data: {
			email,
			username: 'kody',
			name: 'Kody',
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

	const hannah = await prisma.user.create({
		data: {
			email: 'hannah@kcd.dev',
			username: 'hannah',
			name: 'Hannah',
			password: {
				create: {
					hash: await bcrypt.hash('hannahlovesyou', 10),
				},
			},
			contactInfo: {
				create: {
					phone: '555-555-5555',
					address: '123 Main St',
					city: 'San Francisco',
					state: 'CA',
					zip: '94103',
				},
			},
			host: {
				create: {
					bio: 'I love hosting people!',
					ships: {
						create: [
							{
								brandId: brand.id,
								name: 'The Starstruck',
								description: 'The best ship in the galaxy',
								capacity: 6,
								dailyCharge: 12345,
								imageUrl: '/img/ships/the-starstruck.png',
								starportId: starport.id,
							},
						],
					},
				},
			},
			renter: {
				create: {
					bio: 'I love renting ships!',
				},
			},
		},
		include: {
			host: {
				include: {
					ships: true,
				},
			},
		},
	})

	await prisma.user.create({
		data: {
			email: 'marty@kcd.dev',
			username: 'marty',
			name: 'Marty',
			password: {
				create: {
					hash: await bcrypt.hash('martylovesyou', 10),
				},
			},
			contactInfo: {
				create: {
					phone: '555-555-5555',
					address: '123 Main St',
					city: 'San Francisco',
					state: 'CA',
					zip: '94103',
				},
			},
			renter: {
				create: {
					bio: 'I ride onewheels in space!',
					bookings: {
						create: [
							{
								shipId: hannah.host?.ships[0].id!,
								startDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7 * 3),
								endDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7 * 2),
								totalPrice: 12345 * 7,
							},
							{
								shipId: hannah.host?.ships[0].id!,
								startDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
								endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
								totalPrice: 12345 * 5,
							},
						],
					},
					reviews: {
						create: [
							{
								hostId: hannah.id,
								rating: 4,
								description: 'Cleaned up the Starstruck after use!',
							},
						],
					},
					hostReviews: {
						create: [
							{
								hostId: hannah.id,
								description: 'Had a chocolate on my pillow when I arrived!',
								rating: 5,
							},
						],
					},
					shipReviews: {
						create: [
							{
								shipId: hannah.host?.ships[0].id!,
								rating: 3,
								description: 'A bit clunky, but gets you there!',
							},
						],
					},
					chats: {
						create: [
							{
								hostId: hannah.id,
								messages: {
									create: [
										{
											senderId: hannah.id,
											content:
												'Hey there! I heard you were looking for a ship.',
										},
									],
								},
							},
						],
					},
				},
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

import type * as P from '@prisma/client'
import { faker } from '@faker-js/faker'
import bcrypt from 'bcryptjs'

export function createContactInfo(): Omit<
	P.ContactInfo,
	'id' | 'userId' | 'createdAt' | 'updatedAt'
> {
	return {
		email: faker.internet.email(),
		address: faker.address.streetAddress(),
		city: faker.address.city(),
		state: faker.address.state(),
		zip: faker.address.zipCode(),
		country: faker.address.country(),
		phone: faker.phone.number(),
	}
}

export function createUser(): Omit<P.User, 'id' | 'createdAt' | 'updatedAt'> {
	const gender = faker.helpers.arrayElement(['female', 'male']) as
		| 'female'
		| 'male'

	const firstName = faker.name.firstName(gender)
	const lastName = faker.name.lastName()

	const username = faker.helpers.unique(faker.internet.userName, [
		firstName.toLowerCase(),
		lastName.toLowerCase(),
	])
	const imageGender = gender === 'female' ? 'women' : 'men'
	const imageNumber = faker.datatype.number({ min: 0, max: 99 })
	return {
		username,
		name: `${firstName} ${lastName}`,
		email: `${username}@example.com`,
		imageUrl: `https://randomuser.me/api/portraits/${imageGender}/${imageNumber}.jpg`,
	}
}

export const oneDay = 1000 * 60 * 60 * 24
export function createDateRange({
	start,
	end,
	maxDays,
}: {
	start: Date
	end: Date
	maxDays: number
}) {
	const randomStart = faker.date.between(start, end.getTime() - oneDay * 2)
	const endStartRange = randomStart.getTime() + oneDay
	const endEndRange = Math.min(endStartRange + oneDay * maxDays, end.getTime())
	return {
		startDate: randomStart,
		endDate: faker.date.between(endStartRange, endEndRange),
	}
}

const lockifyImage = (imageUrl: string) =>
	imageUrl.replace(/\?(\d+)/, '?lock=$1')

export function createBrand() {
	return {
		name: faker.company.name(),
		description: faker.company.bs(),
		imageUrl: lockifyImage(faker.image.nature(512, 512, true)),
	}
}

export function createShipModel() {
	return {
		name: faker.company.name(),
		description: faker.company.bs(),
		imageUrl: lockifyImage(faker.image.nature(512, 512, true)),
	}
}

export function createStarport() {
	return {
		name: faker.company.name(),
		description: faker.lorem.sentences(3),
		imageUrl: lockifyImage(faker.image.business(512, 512, true)),
		latitude: Number(faker.address.latitude()),
		longitude: Number(faker.address.longitude()),
	}
}

export function createPassword(username: string = faker.internet.userName()) {
	return {
		hash: bcrypt.hashSync(username.toUpperCase(), 10),
	}
}

export function createShip() {
	return {
		name: faker.lorem.word(),
		capacity: faker.datatype.number({ min: 1, max: 10 }),
		description: faker.lorem.sentences(3),
		imageUrl: lockifyImage(faker.image.transport(512, 512, true)),
		dailyCharge: faker.datatype.number({ min: 100, max: 1000 }),
	}
}

export function createBooking({
	start,
	end,
	dailyCharge,
}: {
	start: Date
	end: Date
	dailyCharge: number
}) {
	const { startDate, endDate } = createDateRange({
		start,
		end,
		maxDays: 10,
	})
	const days = Math.ceil((endDate.getTime() - startDate.getTime()) / oneDay)

	const createdAt = faker.date.between(
		startDate.getTime() - oneDay * 10,
		startDate.getTime() - oneDay,
	)
	return {
		createdAt,
		updatedAt: createdAt,
		startDate,
		endDate,
		totalPrice: days * dailyCharge,
	}
}

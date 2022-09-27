import type * as P from '@prisma/client'
import { faker } from '@faker-js/faker'

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
	const firstName = faker.name.firstName()
	const lastName = faker.name.lastName()
	const username = faker.internet.userName(firstName, lastName).toLowerCase()
	return {
		username,
		name: `${firstName} ${lastName}`,
		email: `${username}@example.com`,
		imageUrl: faker.image.avatar(),
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

export function typedBoolean<T>(
	value: T,
): value is Exclude<T, false | null | undefined | '' | 0> {
	return Boolean(value)
}

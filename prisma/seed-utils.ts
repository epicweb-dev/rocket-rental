import { faker } from '@faker-js/faker'
import bcrypt from 'bcryptjs'
import { type PrismaClient } from '@prisma/client'

export async function downloadFile(
	url: string,
	retries: number = 0,
): Promise<Buffer> {
	const MAX_RETRIES = 3
	try {
		const response = await fetch(url)
		if (!response.ok) {
			throw new Error(`Failed to fetch image with status ${response.status}`)
		}
		const blob = Buffer.from(await response.arrayBuffer())
		return blob
	} catch (e) {
		if (retries > MAX_RETRIES) throw e
		return downloadFile(url, retries + 1)
	}
}

export function createContactInfo() {
	return {
		address: faker.address.streetAddress(),
		city: faker.address.city(),
		state: faker.address.state(),
		zip: faker.address.zipCode(),
		country: faker.address.country(),
		phone: faker.phone.number(),
	}
}

export function createUser({
	gender = faker.helpers.arrayElement(['female', 'male']) as 'female' | 'male',
}: {
	gender?: 'male' | 'female'
} = {}) {
	const firstName = faker.name.firstName(gender)
	const lastName = faker.name.lastName()

	const username = faker.helpers.unique(faker.internet.userName, [
		firstName.toLowerCase(),
		lastName.toLowerCase(),
	])
	return {
		username,
		name: `${firstName} ${lastName}`,
		email: `${username}@example.com`,
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

export const lockifyFakerImage = (imageUrl: string) =>
	imageUrl.replace(/\?(\d+)/, '?lock=$1')

export function createBrand() {
	return {
		name: faker.company.name(),
		description: faker.company.bs(),
	}
}

export function createShipModel() {
	return {
		name: faker.company.name(),
		description: faker.company.bs(),
	}
}

export function createStarport() {
	return {
		name: faker.company.name(),
		description: faker.lorem.sentences(3),
		latitude: Number(faker.address.latitude()),
		longitude: Number(faker.address.longitude()),
	}
}

export function createPassword(username: string = faker.internet.userName()) {
	return {
		hash: bcrypt.hashSync(username, 10),
	}
}

export function createShip() {
	return {
		name: faker.lorem.word(),
		capacity: faker.datatype.number({ min: 1, max: 10 }),
		description: faker.lorem.sentences(3),
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

export async function insertImage(prisma: PrismaClient, imageUrl: string) {
	const image = await prisma.image.create({
		data: {
			contentType: 'image/jpeg',
			file: {
				create: {
					blob: await downloadFile(lockifyFakerImage(imageUrl)),
				},
			},
		},
		select: { fileId: true },
	})
	return image.fileId
}

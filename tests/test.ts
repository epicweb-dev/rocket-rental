import type { Page } from '@playwright/test'
import { test as base } from '@playwright/test'
import type { User } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { faker } from '@faker-js/faker'
import { PrismaClient } from '@prisma/client'
import { createUser, createContactInfo } from '../prisma/seed-utils'
import { commitSession, getSession } from '~/services/session.server'
import { authenticator } from '~/services/auth.server'
import { parse } from 'cookie'
import { readFixture } from '../mocks/utils'

const users = new Set<User>()

type Email = {
	to: string
	from: string
	subject: string
	text: string
	html: string
}

export async function readEmail(recipient: string) {
	try {
		// TODO: add validation
		const email = await readFixture(recipient)
		return email as Email
	} catch (error) {
		console.error(`Error reading email`, error)
		return null
	}
}

type LoginForm = {
	name: string
	username: string
	email: string
	password: string
}

export function makeLoginForm(
	overrides: Partial<LoginForm> | undefined = {},
): LoginForm {
	const firstName = overrides.name?.split(' ')?.[0] || faker.name.firstName()
	const lastName = overrides.name?.split(' ')?.[1] || faker.name.lastName()
	const username =
		overrides.username ||
		faker.internet.userName(firstName, lastName).slice(0, 15)
	return {
		name: overrides.name || `${firstName} ${lastName}`,
		username,
		email: `${username}@example.com`,
		password: faker.internet.password(),
	}
}

export async function insertNewUser({ password }: { password?: string } = {}) {
	const prisma = new PrismaClient()
	const userData = createUser()
	const user = await prisma.user.create({
		data: {
			...userData,
			contactInfo: {
				create: createContactInfo(),
			},
			password: {
				create: {
					hash: bcrypt.hashSync(
						password || userData.username.toUpperCase(),
						10,
					),
				},
			},
		},
	})
	await prisma.$disconnect()
	users.add(user)
	return user
}

export async function deleteUserByUsername(username: string) {
	const prisma = new PrismaClient()
	await prisma.user.delete({ where: { username } })
	await prisma.$disconnect()
}

export const test = base.extend<{ login: () => ReturnType<typeof loginPage> }>({
	login: [
		async ({ page, baseURL }, use) => {
			use(() => loginPage({ page, baseURL }))
		},
		{ auto: true },
	],
})

export async function loginPage({
	page,
	baseURL,
}: {
	page: Page
	baseURL: string | undefined
}) {
	const user = await insertNewUser()
	const session = await getSession()
	session.set(authenticator.sessionKey, user.id)
	const cookieValue = await commitSession(session)
	const { _session } = parse(cookieValue)
	page.context().addCookies([
		{
			name: '_session',
			sameSite: 'Lax',
			url: baseURL,
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			value: _session,
		},
	])
	return user
}

export const { expect } = test

test.afterEach(async () => {
	const prisma = new PrismaClient()
	await prisma.user.deleteMany({
		where: { id: { in: [...users].map(u => u.id) } },
	})
	await prisma.$disconnect()
})

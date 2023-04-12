import { test as base, type Page } from '@playwright/test'
import bcrypt from 'bcryptjs'
import { parse } from 'cookie'
import { z } from 'zod'
import { authenticator } from '~/utils/auth.server'
import { commitSession, getSession } from '~/utils/session.server'
import { prisma } from '~/utils/db.server'
import { readFixture } from '../mocks/utils'
import { createContactInfo, createUser } from '../prisma/seed-utils'

export const dataCleanup = {
	users: new Set<string>(),
	ships: new Set<string>(),
	bookings: new Set<string>(),
	shipBrands: new Set<string>(),
	starports: new Set<string>(),
	chats: new Set<string>(),
}

const emailSchema = z.object({
	to: z.string(),
	from: z.string(),
	subject: z.string(),
	text: z.string(),
	html: z.string(),
})

export async function readEmail(recipient: string) {
	try {
		const email = await readFixture('email', recipient)
		return emailSchema.parse(email)
	} catch (error) {
		console.error(`Error reading email`, error)
		return null
	}
}

export async function insertNewUser({ password }: { password?: string } = {}) {
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
		select: { id: true, name: true, username: true, email: true },
	})
	dataCleanup.users.add(user.id)
	return user
}

export function deleteUserByUsername(username: string) {
	return prisma.user.delete({ where: { username } })
}

export const test = base.extend<{
	login: (user?: { id: string }) => ReturnType<typeof loginPage>
}>({
	login: [
		async ({ page, baseURL }, use) => {
			use(user => loginPage({ page, baseURL, user }))
		},
		{ auto: true },
	],
})

export async function loginPage({
	page,
	baseURL,
	user: givenUser,
}: {
	page: Page
	baseURL: string | undefined
	user?: { id: string }
}) {
	const user = givenUser
		? await prisma.user.findUniqueOrThrow({
				where: { id: givenUser.id },
				select: {
					id: true,
					email: true,
					username: true,
					name: true,
				},
		  })
		: await insertNewUser()

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
	type Delegate = {
		deleteMany: (opts: {
			where: { id: { in: Array<string> } }
		}) => Promise<unknown>
	}
	async function deleteAll(items: Set<string>, delegate: Delegate) {
		if (items.size > 0) {
			await delegate.deleteMany({
				where: { id: { in: [...items] } },
			})
		}
	}
	await deleteAll(dataCleanup.users, prisma.user)
	await deleteAll(dataCleanup.ships, prisma.ship)
	await deleteAll(dataCleanup.shipBrands, prisma.shipBrand)
	await deleteAll(dataCleanup.starports, prisma.starport)
	await deleteAll(dataCleanup.bookings, prisma.booking)
	await deleteAll(dataCleanup.chats, prisma.chat)
})

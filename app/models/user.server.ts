import type { Password, User } from '@prisma/client'
import bcrypt from 'bcryptjs'

import { prisma } from '~/db.server'

export type { User } from '@prisma/client'

export async function getUserById(id: User['id']) {
	return prisma.user.findUnique({ where: { id } })
}

export async function getUserByEmail(email: User['email']) {
	return prisma.user.findUnique({ where: { email } })
}

export async function getUserByUsername(email: User['email']) {
	return prisma.user.findUnique({ where: { email } })
}

export async function createUser({
	email,
	username,
	password,
}: {
	email: User['email']
	username: User['username']
	password: string
}) {
	const hashedPassword = await bcrypt.hash(password, 10)

	return prisma.user.create({
		data: {
			email,
			username,
			password: {
				create: {
					hash: hashedPassword,
				},
			},
		},
	})
}

export async function deleteUserByEmail(email: User['email']) {
	return prisma.user.delete({ where: { email } })
}

export async function verifyLogin(
	username: User['username'],
	password: Password['hash'],
) {
	const userWithPassword = await prisma.user.findUnique({
		where: { username },
		include: {
			password: true,
		},
	})

	if (!userWithPassword || !userWithPassword.password) {
		return null
	}

	const isValid = await bcrypt.compare(password, userWithPassword.password.hash)

	if (!isValid) {
		return null
	}

	const { password: _password, ...userWithoutPassword } = userWithPassword

	return userWithoutPassword
}

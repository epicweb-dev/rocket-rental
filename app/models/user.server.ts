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

export async function getUserByUsername(username: User['username']) {
	return prisma.user.findUnique({ where: { username } })
}

export async function resetUserPassword({
	username,
	password,
}: {
	username: User['username']
	password: string
}) {
	const hashedPassword = await bcrypt.hash(password, 10)
	return prisma.user.update({
		where: { username },
		data: {
			password: {
				update: {
					hash: hashedPassword,
				},
			},
		},
	})
}

export async function createUser({
	email,
	username,
	password,
	name,
}: {
	email: User['email']
	username: User['username']
	name: User['name']
	password: string
}) {
	const hashedPassword = await bcrypt.hash(password, 10)

	return prisma.user.create({
		data: {
			email,
			username,
			name,
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

export const MIN_USERNAME_LENGTH = 3
export const MAX_USERNAME_LENGTH = 20

export const MIN_PASSWORD_LENGTH = 6
export const MAX_PASSWORD_LENGTH = 100

export const MIN_NAME_LENGTH = 3
export const MAX_NAME_LENGTH = 40

export function validateName(name: string) {
	if (name.length < MIN_NAME_LENGTH) return 'Name is too short'
	if (name.length > MAX_NAME_LENGTH) return 'Name is too long'
	return null
}

export function validateUsername(username: string) {
	if (username.length < MIN_USERNAME_LENGTH) return 'Username is too short'
	if (username.length > MAX_USERNAME_LENGTH) return 'Username is too long'
	return null
}

export function validatePassword(password: string) {
	if (password.length < MIN_PASSWORD_LENGTH) return 'Password is too short'
	if (password.length > MAX_PASSWORD_LENGTH) return 'Password is too long'
	return null
}

export function validateConfirmPassword({
	password,
	confirmPassword,
}: {
	password: string
	confirmPassword: string
}) {
	return (
		validatePassword(confirmPassword) ||
		(password !== confirmPassword && 'Passwords do not match') ||
		null
	)
}

export async function validateEmailIsUnique(email: string) {
	const user = await getUserByEmail(email)
	if (user) return 'Email is already in use'
	return null
}

export async function validateUserExists(username: string) {
	const user = await getUserByUsername(username)
	if (!user) return 'User does not exist'
	return null
}

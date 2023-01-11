import { z } from 'zod'

export const MIN_USERNAME_LENGTH = 3
export const MAX_USERNAME_LENGTH = 20

export const MIN_PASSWORD_LENGTH = 6
export const MAX_PASSWORD_LENGTH = 100

export const MIN_NAME_LENGTH = 3
export const MAX_NAME_LENGTH = 40

export const usernameSchema = z
	.string()
	.min(MIN_USERNAME_LENGTH, { message: 'Username is too short' })
	.max(MAX_USERNAME_LENGTH, { message: 'Username is too long' })
export const passwordSchema = z
	.string()
	.min(MIN_PASSWORD_LENGTH, { message: 'Password is too short' })
	.max(MAX_PASSWORD_LENGTH, { message: 'Password is too long' })
export const nameSchema = z
	.string()
	.min(MIN_NAME_LENGTH, { message: 'Name is too short' })
	.max(MAX_NAME_LENGTH, { message: 'Name is too long' })

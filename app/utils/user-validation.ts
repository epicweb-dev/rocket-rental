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

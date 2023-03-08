import { faker } from '@faker-js/faker'
import invariant from 'tiny-invariant'
import {
	deleteUserByUsername,
	expect,
	insertNewUser,
	makeLoginForm,
	readEmail,
	test,
} from './test'

const urlRegex = /(?<url>https?:\/\/[^\s$.?#].[^\s]*)/
function extractUrl(text: string) {
	const match = text.match(urlRegex)
	return match?.groups?.url
}

test('onboarding', async ({ page }) => {
	const loginForm = makeLoginForm()

	await page.goto('/')

	await page.getByRole('link', { name: /log in/i }).click()
	await expect(page).toHaveURL(`/login`)

	const createAccountLink = page.getByRole('link', {
		name: /create an account/i,
	})
	await createAccountLink.click()

	await expect(page).toHaveURL(`/signup`)

	const emailTextbox = page.getByRole('textbox', { name: /email/i })
	await emailTextbox.click()
	await emailTextbox.fill(loginForm.email)

	await page.getByRole('button', { name: /submit/i }).click()
	await expect(page.getByRole('button', { name: /submitting/i })).toBeVisible()
	await expect(page.getByRole('button', { name: /submit$/i })).toBeVisible()
	const email = await readEmail(loginForm.email)
	invariant(email, 'Email not found')
	expect(email.to).toBe(loginForm.email)
	expect(email.from).toBe('hello@rocketrental.space')
	expect(email.subject).toMatch(/welcome/i)
	const onboardingUrl = extractUrl(email.text)
	invariant(onboardingUrl, 'Onboarding URL not found')
	await page.goto(onboardingUrl)

	await expect(page).toHaveURL(`/onboarding`)
	await page
		.getByRole('textbox', { name: /username/i })
		.fill(loginForm.username)

	await page.getByRole('textbox', { name: /^name$/i }).fill(loginForm.name)

	await page.getByLabel(/^password$/i).fill(loginForm.password)

	await page.getByLabel(/^confirm password$/i).fill(loginForm.password)

	await page.getByRole('checkbox', { name: /terms/i }).check()

	await page.getByRole('checkbox', { name: /offers/i }).check()

	await page.getByRole('checkbox', { name: /remember me/i }).check()

	await page.getByRole('button', { name: /sign up/i }).click()

	await expect(page).toHaveURL(`/`)

	await page.getByRole('link', { name: loginForm.name }).click()

	await expect(page).toHaveURL(`/users/${loginForm.username}`)

	await page.getByRole('button', { name: /logout/i }).click()
	await expect(page).toHaveURL(`/`)

	await deleteUserByUsername(loginForm.username)
})

test('login as existing user', async ({ page }) => {
	const password = faker.internet.password()
	const user = await insertNewUser({ password })
	invariant(user.name, 'User name not found')
	await page.goto('/login')
	await page.getByRole('textbox', { name: /username/i }).fill(user.username)
	await page.getByLabel(/^password$/i).fill(password)
	await page.getByRole('button', { name: /log in/i }).click()
	await expect(page).toHaveURL(`/`)

	await page.getByRole('link', { name: user.name }).click()

	await expect(page).toHaveURL(`/users/${user.username}`)

	const logoutButton = page.getByRole('button', { name: /logout/i })
	await expect(logoutButton).toContainText(user.name)
	await expect(logoutButton).toBeVisible()

	await logoutButton.click()
	await expect(page).toHaveURL(`/`)
})

test('reset password', async ({ page }) => {
	const originalPassword = faker.internet.password()
	const user = await insertNewUser({ password: originalPassword })
	invariant(user.name, 'User name not found')
	await page.goto('/login')

	await page.getByRole('link', { name: /forgot password/i }).click()
	await expect(page).toHaveURL('/forgot-password')

	await expect(
		page.getByRole('heading', { name: /forgot password/i }),
	).toBeVisible()
	await page.getByRole('textbox', { name: /username/i }).fill(user.username)
	await page.getByRole('button', { name: /submit/i }).click()
	await expect(page.getByRole('button', { name: /submitting/i })).toBeVisible()
	await expect(page.getByRole('button', { name: /submit$/i })).toBeVisible()

	const email = await readEmail(user.email)
	invariant(email, 'Email not found')
	expect(email.subject).toMatch(/password reset/i)
	expect(email.to).toBe(user.email)
	expect(email.from).toBe('hello@rocketrental.space')
	const resetPasswordUrl = extractUrl(email.text)
	invariant(resetPasswordUrl, 'Reset password URL not found')
	await page.goto(resetPasswordUrl)

	await expect(page).toHaveURL(`/reset-password`)
	const newPassword = faker.internet.password()
	await page.getByLabel(/^password$/i).fill(newPassword)
	await page.getByLabel(/^confirm password$/i).fill(newPassword)

	await page.getByRole('button', { name: /reset password/i }).click()

	await expect(page).toHaveURL('/login')
	await page.getByRole('textbox', { name: /username/i }).fill(user.username)
	await page.getByLabel(/^password$/i).fill(originalPassword)
	await page.getByRole('button', { name: /log in/i }).click()

	await expect(page.getByText(/invalid username or password/i)).toBeVisible()

	await page.getByLabel(/^password$/i).fill(newPassword)
	await page.getByRole('button', { name: /log in/i }).click()

	await expect(page).toHaveURL(`/`)

	await page.getByRole('link', { name: user.name }).click()

	await expect(page).toHaveURL(`/users/${user.username}`)

	const logoutButton = page.getByRole('button', { name: /logout/i })
	invariant(user.name, 'User name not found')
	await expect(logoutButton).toContainText(user.name)
	await expect(logoutButton).toBeVisible()
})

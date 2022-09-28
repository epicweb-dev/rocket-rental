import {
	test,
	expect,
	makeLoginForm,
	readEmail,
	insertNewUser,
	deleteUserByUsername,
} from './test'
import invariant from 'tiny-invariant'
import { faker } from '@faker-js/faker'

const urlRegex = /(?<url>https?:\/\/[^\s$.?#].[^\s]*)/
function extractUrl(text: string) {
	const match = text.match(urlRegex)
	return match?.groups?.url
}

test('onboarding', async ({ page, screen }) => {
	const loginForm = makeLoginForm()

	await page.goto('/')

	await (await screen.findByRole('link', { name: /log in/i })).click()
	await expect(page).toHaveURL(`/login`)

	const newHereLink = await screen.findByRole('link', { name: /new here/i })
	await newHereLink.click()

	await expect(page).toHaveURL(`/signup`)

	const emailTextbox = await screen.findByRole('textbox', { name: /email/i })
	await emailTextbox.click()
	await emailTextbox.fill(loginForm.email)

	await (await screen.findByRole('button', { name: /submit/i })).click()
	await expect(
		await screen.findByRole('button', { name: /submitting/i }),
	).toBeVisible()
	await expect(
		await screen.findByRole('button', { name: /submit$/i }),
	).toBeVisible()
	const email = await readEmail(loginForm.email)
	invariant(email, 'Email not found')
	expect(email.to).toBe(loginForm.email)
	expect(email.from).toBe('hello@rocketrental.space')
	expect(email.subject).toMatch(/welcome/i)
	const onboardingUrl = extractUrl(email.text)
	invariant(onboardingUrl, 'Onboarding URL not found')
	await page.goto(onboardingUrl)

	await expect(page).toHaveURL(`/onboarding`)
	await (
		await screen.findByRole('textbox', { name: /username/i })
	).fill(loginForm.username)

	await (
		await screen.findByRole('textbox', { name: /^name$/i })
	).fill(loginForm.name)

	await (await screen.findByLabelText(/^password$/i)).fill(loginForm.password)

	await (
		await screen.findByLabelText(/^confirm password$/i)
	).fill(loginForm.password)

	await (await screen.findByRole('checkbox', { name: /terms/i })).check()

	await (await screen.findByRole('checkbox', { name: /offers/i })).check()

	await (await screen.findByRole('checkbox', { name: /remember me/i })).check()

	await (await screen.findByRole('button', { name: /sign up/i })).click()

	await expect(page).toHaveURL(`/`)

	await (await screen.findByRole('link', { name: loginForm.name })).click()

	await expect(page).toHaveURL(`/users/${loginForm.username}`)

	await (await screen.findByRole('button', { name: /logout/i })).click()
	await expect(page).toHaveURL(`/`)

	await deleteUserByUsername(loginForm.username)
})

test('login as existing user', async ({ page, screen }) => {
	const password = faker.internet.password()
	const user = await insertNewUser({ password })
	invariant(user.name, 'User name not found')
	await page.goto('/login')
	await (
		await screen.findByRole('textbox', { name: /username/i })
	).fill(user.username)
	await (await screen.findByLabelText(/^password$/i)).fill(password)
	await (await screen.findByRole('button', { name: /log in/i })).click()
	await expect(page).toHaveURL(`/`)

	await (await screen.findByRole('link', { name: user.name })).click()

	await expect(page).toHaveURL(`/users/${user.username}`)

	const logoutButton = await screen.findByRole('button', { name: /logout/i })
	await expect(logoutButton).toContainText(user.name)
	await expect(logoutButton).toBeVisible()

	await logoutButton.click()
	await expect(page).toHaveURL(`/`)
})

test('reset password', async ({ page, screen }) => {
	const originalPassword = faker.internet.password()
	const user = await insertNewUser({ password: originalPassword })
	invariant(user.name, 'User name not found')
	await page.goto('/login')

	await (await screen.findByRole('link', { name: /forgot password/i })).click()
	await expect(page).toHaveURL('/forgot-password')

	await expect(
		await screen.findByRole('heading', { name: /forgot password/i }),
	).toBeVisible()
	await (
		await screen.findByRole('textbox', { name: /username/i })
	).fill(user.username)
	await (await screen.findByRole('button', { name: /submit/i })).click()
	await expect(
		await screen.findByRole('button', { name: /submitting/i }),
	).toBeVisible()
	await expect(
		await screen.findByRole('button', { name: /submit$/i }),
	).toBeVisible()

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
	await (await screen.findByLabelText(/^password$/i)).fill(newPassword)
	await (await screen.findByLabelText(/^confirm password$/i)).fill(newPassword)

	await (await screen.findByRole('button', { name: /reset password/i })).click()

	await expect(page).toHaveURL('/login')
	await (
		await screen.findByRole('textbox', { name: /username/i })
	).fill(user.username)
	await (await screen.findByLabelText(/^password$/i)).fill(originalPassword)
	await (await screen.findByRole('button', { name: /log in/i })).click()

	await expect(
		await screen.findByText(/invalid username or password/i),
	).toBeVisible()

	await (await screen.findByLabelText(/^password$/i)).fill(newPassword)
	await (await screen.findByRole('button', { name: /log in/i })).click()

	await expect(page).toHaveURL(`/`)

	await (await screen.findByRole('link', { name: user.name })).click()

	await expect(page).toHaveURL(`/users/${user.username}`)

	const logoutButton = await screen.findByRole('button', { name: /logout/i })
	invariant(user.name, 'User name not found')
	await expect(logoutButton).toContainText(user.name)
	await expect(logoutButton).toBeVisible()
})

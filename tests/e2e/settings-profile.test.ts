import { faker } from '@faker-js/faker'
import { expect, insertNewUser, test } from '../test-utils'
import { createContactInfo, createUser } from '../../prisma/seed-utils'
import { verifyLogin } from '~/utils/auth.server'

test('Users can update their basic info', async ({ login, page }) => {
	await login()
	await page.goto('/settings/profile')

	const newUserData = createUser()
	const newUserContactInfo = createContactInfo()

	await page.getByRole('textbox', { name: /^name/i }).fill(newUserData.name)
	await page
		.getByRole('textbox', { name: /^username/i })
		.fill(newUserData.username)
	// TODO: support changing the email... probably test this in another test though
	// await page.getByRole('textbox', {name: /^email/i}).fill(newUserData.email)

	await page
		.getByRole('textbox', { name: /^phone/i })
		.fill(newUserContactInfo.phone)
	await page
		.getByRole('textbox', { name: /^address/i })
		.fill(newUserContactInfo.address)
	await page
		.getByRole('textbox', { name: /^city/i })
		.fill(newUserContactInfo.city)
	await page
		.getByRole('textbox', { name: /^state/i })
		.fill(newUserContactInfo.state)
	await page
		.getByRole('textbox', { name: /^zip/i })
		.fill(newUserContactInfo.zip)
	await page
		.getByRole('textbox', { name: /^country/i })
		.fill(newUserContactInfo.country)

	await page.getByRole('button', { name: /^save/i }).click()

	await expect(page).toHaveURL(`/users/${newUserData.username}`)
})

test('Users can update their password', async ({ login, page }) => {
	const oldPassword = faker.internet.password()
	const newPassword = faker.internet.password()
	const user = await insertNewUser({ password: oldPassword })
	await login(user)
	await page.goto('/settings/profile')

	const fieldset = page.getByRole('group', { name: /change password/i })

	await fieldset
		.getByRole('textbox', { name: /^current password/i })
		.fill(oldPassword)
	await fieldset
		.getByRole('textbox', { name: /^new password/i })
		.fill(newPassword)

	await page.getByRole('button', { name: /^save/i }).click()

	await expect(page).toHaveURL(`/users/${user.username}`)

	expect(
		await verifyLogin(user.username, oldPassword),
		'Old password still works',
	).toEqual(null)
	expect(
		await verifyLogin(user.username, newPassword),
		'New password does not work',
	).toEqual({ id: user.id })
})

test('Users can become a host', async ({ login, page }) => {
	const user = await login()
	await page.goto('/settings/profile')

	await page.getByRole('button', { name: /become a host/i }).click()

	const hostBio = faker.lorem.sentences(2)
	const hostBioLocator = page.getByRole('textbox', { name: /host bio/i })
	await expect(hostBioLocator).toBeFocused()
	await hostBioLocator.fill(hostBio)

	await page.getByRole('button', { name: /^save/i }).click()

	await expect(page, 'Was not redirected to the /host profile').toHaveURL(
		`/users/${user.username}/host`,
	)
	await expect(page.getByText(hostBio)).toBeVisible()
})

test('Users can become a renter', async ({ login, page }) => {
	const user = await login()
	await page.goto('/settings/profile')

	await page.getByRole('button', { name: /become a renter/i }).click()

	const renterBio = faker.lorem.sentences(2)
	const renterBioLocator = page.getByRole('textbox', { name: /renter bio/i })
	await expect(renterBioLocator).toBeFocused()
	await renterBioLocator.fill(renterBio)

	await page.getByRole('button', { name: /^save/i }).click()

	await expect(page, 'Was not redirected to the /renter profile').toHaveURL(
		`/users/${user.username}/renter`,
	)
	await expect(page.getByText(renterBio)).toBeVisible()
})

test('Users can update their profile photo', async ({ login, page }) => {
	const user = await login()
	await page.goto('/settings/profile')

	const beforeSrc = await page
		.getByAltText(user.name ?? user.username)
		.getAttribute('src')

	await page.getByRole('link', { name: /change profile photo/i }).click()

	await expect(page).toHaveURL(`/settings/profile/photo`)

	await page
		.getByRole('dialog', { name: /profile photo/i })
		.getByLabel(/change/i)
		.setInputFiles('./tests/fixtures/test-profile.jpg')

	await page
		.getByRole('dialog', { name: /profile photo/i })
		.getByRole('button', { name: /save/i })
		.click()

	await expect(
		page,
		'Was not redirected after saving the profile photo',
	).toHaveURL(`/settings/profile`)

	const afterSrc = await page
		.getByAltText(user.name ?? user.username)
		.getAttribute('src')

	expect(beforeSrc).not.toEqual(afterSrc)
})

import { test, loginPage, expect, prisma } from '../test-utils'
import { faker } from '@faker-js/faker'

test('multi-user chat', async ({ browser, page: renterPage, baseURL }) => {
	const hostPage = await (await browser.newContext()).newPage()

	const renterUser = await loginPage({ page: renterPage, baseURL })
	const hostUser = await loginPage({ page: hostPage, baseURL })

	await prisma.renter.create({
		data: { userId: renterUser.id },
	})
	await prisma.host.create({
		data: { userId: hostUser.id },
	})

	// go to another user's page and start a chat:
	await renterPage.goto(`/users/${hostUser.username}`)
	await renterPage.getByRole('button', { name: /message/i }).click()
	await expect(renterPage).toHaveURL(/\/chats\/.+/)

	// go to your own page and open an existing chat:
	await hostPage.goto(`/users/${hostUser.username}`)
	await hostPage.getByRole('link', { name: /my chat/i }).click()
	await hostPage
		.getByRole('link', {
			name: new RegExp(renterUser.name ?? renterUser.username, 'i'),
		})
		.click()
	await expect(hostPage).toHaveURL(/\/chats\/.+/)

	// wait for connection to be established
	await renterPage.waitForTimeout(200)

	// type from page 1
	const page1Textbox = renterPage.getByRole('textbox', { name: /message/i })
	const testMessage = faker.lorem.words(2)
	await page1Textbox.fill(testMessage)
	await page1Textbox.press('Enter')

	await expect(page1Textbox).toBeEmpty()

	// check that both pages receive the message
	await expect(
		renterPage.getByRole('listitem').getByText(testMessage),
	).toBeVisible()
	await expect(
		hostPage.getByRole('listitem').getByText(testMessage),
	).toBeVisible()
})

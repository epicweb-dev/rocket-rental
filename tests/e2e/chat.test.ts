import { test, loginPage, expect } from '../test-utils'
import { faker } from '@faker-js/faker'

test('multi-user chat', async ({ browser, page: page1, baseURL }) => {
	const page2 = await (await browser.newContext()).newPage()

	const user1 = await loginPage({ page: page1, baseURL })
	const user2 = await loginPage({ page: page2, baseURL })

	// go to another user's page and start a chat:
	await page1.goto(`/users/${user2.username}`)
	await page1.getByRole('button', { name: /chat/i }).click()
	await expect(page1).toHaveURL(/\/chats\/.+/)

	// go to your own page and open an existing chat:
	await page2.goto(`/users/${user2.username}`)
	await page2.getByRole('link', { name: new RegExp(user1.username) }).click()
	await expect(page2).toHaveURL(/\/chats\/.+/)

	// wait for connection to be established
	await page1.waitForTimeout(200)

	// type from page 1
	const page1Textbox = page1.getByRole('textbox', { name: /message/i })
	const testMessage = faker.lorem.words(2)
	await page1Textbox.fill(testMessage)
	await page1Textbox.press('Enter')

	await expect(page1Textbox).toBeEmpty()

	// check that both pages receive the message
	await expect(page1.getByRole('listitem').getByText(testMessage)).toBeVisible()
	await expect(page2.getByRole('listitem').getByText(testMessage)).toBeVisible()
})

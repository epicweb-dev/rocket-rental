import { faker } from '@faker-js/faker'

describe('smoke tests', () => {
	afterEach(() => {
		cy.cleanupUser()
	})

	it('should allow you to register and login', () => {
		const firstName = faker.name.firstName()
		const lastName = faker.name.lastName()
		const username = faker.internet.userName(firstName, lastName)
		const loginForm = {
			name: `${firstName} ${lastName}`,
			username,
			email: `${username}@example.com`,
			password: faker.internet.password(),
		}

		cy.then(() => ({ email: loginForm.email })).as('user')

		cy.visitAndCheck('/')

		cy.findByRole('link', { name: /log in/i }).click()
		cy.findByRole('link', { name: /new here/i }).click()

		cy.findByRole('textbox', { name: /username/i }).type(loginForm.username)
		cy.findByRole('textbox', { name: /email/i }).type(loginForm.email)
		cy.findByRole('textbox', { name: /^name$/i }).type(loginForm.name)
		cy.findByLabelText(/^password$/i).type(loginForm.password)
		cy.findByLabelText(/confirm password/i).type(loginForm.password)
		cy.findByRole('checkbox', { name: /agree/i }).check()
		cy.findByRole('checkbox', { name: /discounts/i }).check()

		cy.findByRole('button', { name: /sign up/i }).click()

		cy.findByRole('button', { name: /logout/i }).click()
		cy.findByRole('link', { name: /log in/i })
	})

	it('should allow you to make a note', () => {
		cy.login()

		cy.visitAndCheck('/')

		cy.findByRole('button', { name: /logout/i }).click()
		cy.findByRole('link', { name: /log in/i })
	})
})

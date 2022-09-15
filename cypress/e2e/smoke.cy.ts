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

		cy.then(() => ({ email: loginForm.email, username })).as('user')

		cy.visitAndCheck('/')

		cy.findByRole('link', { name: /log in/i }).click()
		cy.findByRole('link', { name: /new here/i }).click()

		cy.findByRole('textbox', { name: /email/i }).type(loginForm.email)
		cy.findByRole('button', { name: /^submit$/i }).click()
		cy.findByRole('button', { name: /^submitting\.\.\.$/i }).should('exist')
		cy.findByRole('button', { name: /^submit$/i }).should('exist')

		cy.wait(200)

		cy.readFile('mocks/msw.local.json').then(
			(data: { email: { text: string } }) => {
				const confirmationLink = data.email.text.match(
					/(http.+signup.+)(\n|$)/,
				)?.[1]
				if (confirmationLink) {
					return cy.visit(confirmationLink).wait(200)
				}
				throw new Error('Could not find confirmation link email')
			},
		)

		cy.findByRole('textbox', { name: /username/i }).type(loginForm.username)
		cy.findByRole('textbox', { name: /^name$/i }).type(loginForm.name)
		cy.findByLabelText(/^password$/i).type(loginForm.password)
		cy.findByLabelText(/confirm password/i).type(loginForm.password)
		cy.findByRole('checkbox', { name: /agree/i }).check()
		cy.findByRole('checkbox', { name: /discounts/i }).check()

		cy.findByRole('button', { name: /sign up/i }).click()

		cy.findByRole('button', { name: /logout/i }).click()
		cy.findByRole('link', { name: /log in/i })
	})

	it('should allow existing users to login', () => {
		cy.login()

		cy.visitAndCheck('/')

		cy.findByRole('button', { name: /logout/i }).click()
		cy.findByRole('link', { name: /log in/i })
	})

	it('should allow users to reset their password', () => {
		const username = faker.internet.userName()
		cy.then(() => ({ username })).as('user')
		cy.exec(
			`npx ts-node --require tsconfig-paths/register ./cypress/support/create-user.ts "${username}"`,
		)

		cy.visitAndCheck('/login', 200)
		cy.findByRole('link', { name: /forgot password/i })
			.click()
			.wait(200)

		cy.findByRole('textbox', { name: /username/i }).type(username)
		cy.findByRole('button', { name: /^submit$/i }).click()
		cy.findByRole('button', { name: /submitting\.\.\.$/i }).should('exist')
		cy.findByRole('button', { name: /^submit$/i }).should('exist')

		cy.readFile('mocks/msw.local.json').then(
			(data: { email: { text: string } }) => {
				const resetLink = data.email.text.match(
					/(http.+forgot-password.+)(\n|$)/,
				)?.[1]
				if (resetLink) {
					return cy.visit(resetLink).wait(200)
				}
				throw new Error('Could not find reset link email')
			},
		)

		const newPassword = faker.internet.password()
		cy.findByLabelText(/^password$/i).type(newPassword)
		cy.findByLabelText(/confirm password/i).type(newPassword)
		cy.findByRole('button', { name: /reset password/i }).click()

		cy.location('pathname').should('contain', '/login')
		cy.findByRole('textbox', { name: /username/i }).type(username)
		cy.findByLabelText(/^password$/i).type(newPassword)

		cy.findByRole('button', { name: /log in/i }).click()
		cy.findByRole('button', { name: /logout/i }).click()
		cy.findByRole('link', { name: /log in/i })
	})
})

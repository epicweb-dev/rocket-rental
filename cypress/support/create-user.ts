// Use this to create a new user and login with that user
// Simply call this with:
// npx ts-node --require tsconfig-paths/register ./cypress/support/create-user.ts username
// and it will log out the cookie value you can use to interact with the server
// as that new user.

import { installGlobals } from '@remix-run/node'
import { parse } from 'cookie'
import { faker } from '@faker-js/faker'

import { createUser } from '~/models/user.server'
import { commitSession, getSession } from '~/services/session.server'
import { authenticator } from '~/services/auth.server'

installGlobals()

async function createAndLogin(username: string) {
	if (!username) {
		throw new Error('username required for login')
	}

	const firstName = faker.name.firstName()
	const lastName = faker.name.lastName()
	const loginForm = {
		name: `${firstName} ${lastName}`,
		username,
		email: `${username}@example.com`,
		password: faker.internet.password(),
	}

	const user = await createUser(loginForm)

	const session = await getSession()
	session.set(authenticator.sessionKey, user.id)
	const cookieValue = await commitSession(session)
	const parsedCookie = parse(cookieValue)
	// we log it like this so our cypress command can parse it out and set it as
	// the cookie value.
	console.log(
		`
<cookie>
  ${parsedCookie._session}
</cookie>
  `.trim(),
	)
}

createAndLogin(process.argv[2])

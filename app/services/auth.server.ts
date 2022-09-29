import { Authenticator } from 'remix-auth'
// import {
// 	GoogleStrategy,
// 	FacebookStrategy,
// 	SocialsProvider,
// } from 'remix-auth-socials'
import { FormStrategy } from 'remix-auth-form'
import invariant from 'tiny-invariant'
import { sessionStorage } from './session.server'
import { verifyLogin } from '~/models/user.server'
import { redirect } from '@remix-run/server-runtime'

export const authenticator = new Authenticator<string>(sessionStorage, {
	sessionKey: 'token',
})

authenticator.use(
	new FormStrategy(async ({ form }) => {
		const username = form.get('username')
		const password = form.get('password')

		invariant(typeof username === 'string', 'username must be a string')
		invariant(username.length > 0, 'username must not be empty')

		invariant(typeof password === 'string', 'password must be a string')
		invariant(password.length > 0, 'password must not be empty')

		const user = await verifyLogin(username, password)
		if (!user) {
			throw new Error('Invalid username or password')
		}

		return user.id
	}),
	FormStrategy.name,
)

export async function requireUserId(request: Request) {
	const requestUrl = new URL(request.url)
	const loginParams = new URLSearchParams([
		['redirectTo', `${requestUrl.pathname}${requestUrl.search}`],
	])
	const failureRedirect = `/login?${loginParams}`
	const userId = await authenticator.isAuthenticated(request, {
		failureRedirect,
	})
	return userId
}

export async function getUserId(request: Request) {
	return authenticator.isAuthenticated(request)
}

// authenticator.use(
// 	new GoogleStrategy(
// 		{
// 			clientID: 'YOUR_CLIENT_ID',
// 			clientSecret: 'YOUR_CLIENT_SECRET',
// 			callbackURL: `http://localhost:3333/auth/${SocialsProvider.GOOGLE}/callback`,
// 		},
// 		async ({ profile }) => {
// 			// here you would find or create a user in your database
// 			return profile
// 		},
// 	),
// )

// authenticator.use(
// 	new FacebookStrategy(
// 		{
// 			clientID: 'YOUR_CLIENT_ID',
// 			clientSecret: 'YOUR_CLIENT_SECRET',
// 			callbackURL: `https://localhost:3333/auth/${SocialsProvider.FACEBOOK}/callback`,
// 		},
// 		async ({ profile }) => {
// 			// here you would find or create a user in your database
// 			return profile
// 		},
// 	),
// )

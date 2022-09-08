import { createCookieSessionStorage } from '@remix-run/node'
import invariant from 'tiny-invariant'

invariant(process.env.SESSION_SECRET, 'SESSION_SECRET must be set')

export let sessionStorage = createCookieSessionStorage({
	cookie: {
		name: '_session',
		sameSite: 'lax',
		path: '/',
		httpOnly: true,
		secrets: [process.env.SESSION_SECRET],
		secure: process.env.NODE_ENV === 'production',
	},
})

// you can also export the methods individually for your own usage
export let { getSession, commitSession, destroySession } = sessionStorage

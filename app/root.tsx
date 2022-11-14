import type { LinksFunction, LoaderArgs, MetaFunction } from '@remix-run/node'
import { json } from '@remix-run/node'
import {
	Links,
	LiveReload,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
} from '@remix-run/react'
import { getUserById } from './models/user.server'
import { authenticator } from './utils/auth.server'

import tailwindStylesheetUrl from './styles/tailwind.css'
import { links as vendorLinks } from './utils/vendor.css'

export const links: LinksFunction = () => {
	return [{ rel: 'stylesheet', href: tailwindStylesheetUrl }, ...vendorLinks]
}

export const meta: MetaFunction = () => ({
	charset: 'utf-8',
	title: 'Rocket Rental',
	viewport: 'width=device-width,initial-scale=1',
})

export function action() {
	// this is for useRevalidator
	return { ok: true }
}

export async function loader({ request }: LoaderArgs) {
	const userId = await authenticator.isAuthenticated(request)

	let user: Awaited<ReturnType<typeof getUserById>> | null = null
	if (userId) {
		user = await getUserById(userId)
		if (!user) {
			// something weird happened... The user is authenticated but we can't find
			// them in the database. Maybe they were deleted? Let's log them out.
			await authenticator.logout(request, { redirectTo: '/' })
		}
	}

	return json({ user })
}

export default function App() {
	return (
		<html lang="en" className="h-full">
			<head>
				<Meta />
				<Links />
			</head>
			<body className="h-full">
				<Outlet />
				<ScrollRestoration />
				<Scripts />
				<LiveReload />
			</body>
		</html>
	)
}

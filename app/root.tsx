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
import { authenticator } from './services/auth.server'

import tailwindStylesheetUrl from './styles/tailwind.css'

export const links: LinksFunction = () => {
	return [{ rel: 'stylesheet', href: tailwindStylesheetUrl }]
}

export const meta: MetaFunction = () => ({
	charset: 'utf-8',
	title: 'Rocket Rental',
	viewport: 'width=device-width,initial-scale=1',
})

export async function loader({ request }: LoaderArgs) {
	const userId = await authenticator.isAuthenticated(request)

	return json({
		user: userId ? await getUserById(userId) : null,
	})
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

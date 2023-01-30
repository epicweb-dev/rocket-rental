import {
	json,
	type DataFunctionArgs,
	type LinksFunction,
	type V2_MetaFunction,
} from '@remix-run/node'
import {
	Links,
	LiveReload,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
	useLoaderData,
} from '@remix-run/react'
import { authenticator } from './utils/auth.server'

import tailwindStylesheetUrl from './styles/tailwind.css'
import { prisma } from './utils/db.server'
import { getEnv } from './utils/env.server'
import { links as vendorLinks } from './utils/vendor.css'

export const links: LinksFunction = () => {
	return [{ rel: 'stylesheet', href: tailwindStylesheetUrl }, ...vendorLinks]
}

export const meta: V2_MetaFunction = () => {
	return [
		{ title: 'Rocket Rental' },
		{ charSet: 'utf-8' },
		{ name: 'viewport', content: 'width=device-width,initial-scale=1' },
	]
}

export async function getUserById(id: string) {
	return prisma.user.findUnique({
		where: { id },
		select: { id: true, name: true },
	})
}

export async function loader({ request }: DataFunctionArgs) {
	const userId = await authenticator.isAuthenticated(request)

	let user: Awaited<ReturnType<typeof getUserById>> | null = null
	if (userId) {
		user = await getUserById(userId)
		if (!user) {
			console.log('something weird happened')
			// something weird happened... The user is authenticated but we can't find
			// them in the database. Maybe they were deleted? Let's log them out.
			await authenticator.logout(request, { redirectTo: '/' })
		}
	}

	return json({ user, ENV: getEnv() })
}

export default function App() {
	const data = useLoaderData<typeof loader>()
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
				<script
					dangerouslySetInnerHTML={{
						__html: `window.ENV = ${JSON.stringify(data.ENV)}`,
					}}
				/>
				<LiveReload />
			</body>
		</html>
	)
}

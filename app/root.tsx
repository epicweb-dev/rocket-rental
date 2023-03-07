import {
	json,
	type DataFunctionArgs,
	type LinksFunction,
	type V2_MetaFunction,
} from '@remix-run/node'
import {
	Link,
	Links,
	LiveReload,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
	useFetcher,
	useLoaderData,
} from '@remix-run/react'
import { cssBundleHref } from '@remix-run/css-bundle'
import * as Checkbox from '@radix-ui/react-checkbox'
import { authenticator } from './utils/auth.server'
import tailwindStylesheetUrl from './styles/tailwind.css'
import appStylesheetUrl from './styles/app.css'
import { links as vendorLinks } from './utils/vendor.css'
import rootStylesheetUrl from './root.css'
import { getEnv } from './utils/env.server'
import { prisma } from './utils/db.server'
import { typedBoolean } from './utils/misc'
import { useId, useState } from 'react'
import clsx from 'clsx'
import { generateStarsSvg } from './utils/starfield.server'

export const links: LinksFunction = () => {
	return [
		{ rel: 'stylesheet', href: '/fonts/nunito-sans/font.css' },
		{ rel: 'stylesheet', href: tailwindStylesheetUrl },
		cssBundleHref ? { rel: 'stylesheet', href: cssBundleHref } : null,
		...vendorLinks,
		{ rel: 'stylesheet', href: appStylesheetUrl },
		{ rel: 'stylesheet', href: rootStylesheetUrl },
	].filter(typedBoolean)
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
			console.info('something weird happened')
			// something weird happened... The user is authenticated but we can't find
			// them in the database. Maybe they were deleted? Let's log them out.
			await authenticator.logout(request, { redirectTo: '/' })
		}
	}

	return json({ user, ENV: getEnv() })
}

export default function App() {
	const data = useLoaderData<typeof loader>()
	const { user } = data
	return (
		<html lang="en" className="dark h-full">
			<head>
				<Meta />
				<Links />
			</head>
			<body className="h-full bg-[#090909]">
				<header className="mx-auto max-w-7xl py-6">
					<nav className="flex justify-between">
						<Link to="/" className="text-white">
							<div className="font-light">rocket</div>
							<div className="font-bold">Rental</div>
						</Link>
						<div className="flex items-center gap-10">
							<Link to="/search" className="text-white">
								🔍
							</Link>
							{user ? (
								<Link to="me" className="text-white">
									{user.name}
								</Link>
							) : (
								<Link
									to="/login"
									className="rounded-full bg-primary py-3.5 px-10 text-sm font-bold text-white hover:bg-primary-darker"
								>
									Log In
								</Link>
							)}
						</div>
					</nav>
				</header>

				<Outlet />

				<div className="container mx-auto flex justify-between">
					<Link to="/" className="text-white">
						<div className="font-light">rocket</div>
						<div className="font-bold">Rental</div>
					</Link>
					<div className="flex gap-10">
						<div>
							<select>
								<option value="en">EN</option>
							</select>
						</div>
						<div>
							<ThemeSwitch />
						</div>
					</div>
				</div>
				<div className="h-5" />
				<ScrollRestoration />
				<Scripts />
				<script
					dangerouslySetInnerHTML={{
						__html: `window.ENV = ${JSON.stringify(data.ENV)}`,
					}}
				/>
				<LiveReload />
				<NoHydrate className="fixed inset-0 -z-10" getHTML={generateStarsSvg} />
			</body>
		</html>
	)
}

function NoHydrate({
	getHTML,
	...rest
}: { getHTML?: () => string } & JSX.IntrinsicElements['div']) {
	const id = useId()
	const [html] = useState(() => {
		if (typeof document === 'undefined') return getHTML?.() ?? ''
		const el = document.getElementById(id)
		if (!el) return getHTML?.() ?? ''
		return el.innerHTML
	})
	return <div {...rest} id={id} dangerouslySetInnerHTML={{ __html: html }} />
}

function ThemeSwitch() {
	const fetcher = useFetcher()
	const [mode, setMode] = useState<'system' | 'dark' | 'light'>('system')
	const checked: boolean | 'indeterminate' =
		mode === 'system' ? 'indeterminate' : mode === 'dark'
	const theme = mode === 'system' ? 'dark' : mode
	return (
		<fetcher.Form>
			<label>
				<Checkbox.Root
					className={clsx('bg-gray-[#1E1E20] h-10 w-20 rounded-full p-1', {
						'bg-[#1E1E20]': theme === 'dark',
						'bg-white': theme === 'light',
					})}
					checked={checked}
					name="theme"
					value={mode}
					onCheckedChange={() =>
						setMode(oldMode =>
							oldMode === 'system'
								? 'light'
								: oldMode === 'light'
								? 'dark'
								: 'system',
						)
					}
					aria-label={
						mode === 'system'
							? 'System Theme'
							: mode === 'dark'
							? 'Dark Theme'
							: 'Light Theme'
					}
				>
					<span
						className={clsx('flex justify-between rounded-full', {
							'bg-white': mode === 'system' && theme === 'dark',
							'theme-switch-light': mode === 'system' && theme === 'light',
						})}
					>
						<span
							className={clsx(
								'theme-switch-light',
								'flex h-8 w-8 items-center justify-center rounded-full',
								{
									'text-white': mode === 'light',
								},
							)}
						>
							🔆
						</span>
						<span
							className={clsx(
								'theme-switch-dark',
								'flex h-8 w-8 items-center justify-center rounded-full',
								{
									'text-white': mode === 'dark',
								},
							)}
						>
							🌙
						</span>
					</span>
				</Checkbox.Root>
			</label>
		</fetcher.Form>
	)
}

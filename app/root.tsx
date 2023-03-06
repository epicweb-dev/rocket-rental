import type {
	LinksFunction,
	DataFunctionArgs,
	V2_MetaFunction,
} from '@remix-run/node'
import { json } from '@remix-run/node'
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
import { useState } from 'react'
import clsx from 'clsx'

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
			console.log('something weird happened')
			// something weird happened... The user is authenticated but we can't find
			// them in the database. Maybe they were deleted? Let's log them out.
			await authenticator.logout(request, { redirectTo: '/' })
		}
	}

	return json({ user, ENV: getEnv(), starsSvg: generateStarsSvg() })
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
				<div
					className="fixed inset-0 -z-10"
					dangerouslySetInnerHTML={{ __html: data.starsSvg }}
				/>
			</body>
		</html>
	)
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

function generateStarsSvg() {
	const width = 1280
	const height = 720
	const starfieldSvg = /* html */ `
<svg preserveAspectRatio="none" id="starfield" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" style="background-color:#090909;min-height:100%;min-width:100%">
<style>
@keyframes sparkle {
  0% { opacity: 0.3; }
  50% { opacity: 0.8; }
  100% { opacity: 0.3; }
}
#starfield circle {
  fill: url(#star-gradient);
}
@media (prefers-reduced-motion: no-preference) {
  #starfield circle {
    opacity: var(--so, 0.5);
    animation: sparkle var(--tw, 2s) infinite;
  }
}
</style>
  <defs>
    <radialGradient id="star-gradient">
      <stop offset="0%" stop-color="#fff" />
      <stop offset="60%" stop-color="#ccc" />
      <stop offset="100%" stop-color="#333" />
    </radialGradient>
  </defs>
${generateStarCircles({ density: 1.7, width, height })}
</svg>
`
	return starfieldSvg
}

function generateStarCircles({
	density,
	width,
	height,
}: {
	density: number
	width: number
	height: number
}) {
	let numStars = Math.floor((density / 10_000) * width * height)

	// Calculate the spacing between each row and column in the grid
	const spacing = Math.sqrt((width * height) / numStars)
	const cols = Math.floor(width / spacing) + 1
	const rows = Math.floor(height / spacing) + 1

	const circles: Array<string> = []
	// Add circles for each star, spaced evenly in a grid
	for (let i = 0; i < cols; i++) {
		for (let j = 0; j < rows; j++) {
			// Calculate the x and y position of the star in the grid, with a random offset
			const x = Math.floor(
				i * spacing + ((Math.random() * 2 - 1) * spacing) / 2,
			)
			const y = Math.floor(
				j * spacing + ((Math.random() * 2 - 1) * spacing) / 2,
			)

			// Add a circle element for the star with random size and position within the grid
			const size = (Math.random() * 2 + 0.5).toFixed(1)
			const twinkle = (Math.random() * 2.5 + 1.8).toFixed(1)
			const startingOpacity = Math.random().toFixed(1)
			circles.push(
				`<circle cx="${x}" cy="${y}" r="${size}" style="--so:${startingOpacity};--tw:${twinkle}s;" />`,
			)
		}
	}
	return circles.join('\n')
}

import { NavLink, Outlet, useMatches } from '@remix-run/react'
import clsx from 'clsx'
import { GeneralErrorBoundary } from '~/components/error-boundary'
import type { DataFunctionArgs } from '@remix-run/node'
import { json } from '@remix-run/node'
import invariant from 'tiny-invariant'
import { prisma } from '~/utils/db.server'

export async function loader({ params }: DataFunctionArgs) {
	invariant(params.username, 'Missing username')
	const user = await prisma.user.findUnique({
		where: { username: params.username },
	})
	if (!user) {
		throw new Response('not found', { status: 404 })
	}

	return json({})
}

export default function UserRoute() {
	const matches = useMatches()
	const lastMatch = matches[matches.length - 1]
	const onIndexPage = lastMatch.id.endsWith('index')

	return (
		<div className="mt-36 mb-48">
			{onIndexPage ? null : (
				<div className="container mx-auto flex justify-end">
					<div className="flex justify-between rounded-full border border-night-400 bg-night-700">
						<NavLink
							preventScrollReset
							prefetch="intent"
							to="host"
							className={({ isActive }) =>
								clsx('rounded-full py-3 px-12 leading-3', {
									'bg-night-700 text-white': !isActive,
									'bg-white text-black': isActive,
								})
							}
						>
							Host
						</NavLink>
						<NavLink
							preventScrollReset
							prefetch="intent"
							to="renter"
							className={({ isActive }) =>
								clsx('rounded-full py-3 px-12 leading-3', {
									'bg-night-700 text-white': !isActive,
									' bg-white text-black': isActive,
								})
							}
						>
							Renter
						</NavLink>
					</div>
				</div>
			)}
			<Outlet />
		</div>
	)
}

export function ErrorBoundary() {
	return (
		<GeneralErrorBoundary
			statusHandlers={{
				404: ({ params }) => (
					<p>No user with the username "{params.username}" exists</p>
				),
			}}
		/>
	)
}

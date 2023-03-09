import { json, redirect, type DataFunctionArgs } from '@remix-run/node'
import {
	Form,
	NavLink,
	Outlet,
	useCatch,
	useLoaderData,
	useMatches,
	useNavigate,
	useParams,
} from '@remix-run/react'
import clsx from 'clsx'
import invariant from 'tiny-invariant'
import { getUserId, requireUserId } from '~/utils/auth.server'
import { prisma } from '~/utils/db.server'
import { getUserImgSrc, useOptionalUser } from '~/utils/misc'

export default function UserRoute() {
	const matches = useMatches()
	const lastMatch = matches[matches.length - 1]
	const onIndexPage = lastMatch.id.endsWith('index')

	return (
		<div className="container mx-auto mt-36 mb-48">
			{onIndexPage ? null : (
				<div className="flex justify-end">
					<div className="border-night-lite bg-night flex justify-between rounded-full border">
						<NavLink
							preventScrollReset
							prefetch="intent"
							to="host"
							className={({ isActive }) =>
								clsx('rounded-full py-3 px-12 leading-3', {
									'bg-night text-white': !isActive,
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
									'bg-night text-white': !isActive,
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

export function CatchBoundary() {
	const caught = useCatch()
	const params = useParams()

	if (caught.status === 404) {
		return <div>User "{params.username}" not found</div>
	}

	throw new Error(`Unexpected caught response with status: ${caught.status}`)
}

export function ErrorBoundary({ error }: { error: Error }) {
	console.error(error)

	return <div>An unexpected error occurred: {error.message}</div>
}

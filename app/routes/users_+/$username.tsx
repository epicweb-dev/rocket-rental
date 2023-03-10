import {
	NavLink,
	Outlet,
	useCatch,
	useMatches,
	useParams,
} from '@remix-run/react'
import clsx from 'clsx'

export default function UserRoute() {
	const matches = useMatches()
	const lastMatch = matches[matches.length - 1]
	const onIndexPage = lastMatch.id.endsWith('index')

	return (
		<div className="mx-auto mt-36 mb-48">
			{onIndexPage ? null : (
				<div className="flex justify-end">
					<div className="flex justify-between rounded-full border border-night-lite bg-night">
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

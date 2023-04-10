import { json, type DataFunctionArgs } from '@remix-run/node'
import {
	Form,
	NavLink,
	Outlet,
	useLoaderData,
	useMatches,
} from '@remix-run/react'
import clsx from 'clsx'
import invariant from 'tiny-invariant'
import { GeneralErrorBoundary } from '~/components/error-boundary'
import { getUserId } from '~/utils/auth.server'
import { prisma } from '~/utils/db.server'
import { Button } from '~/utils/forms'

export async function loader({ request, params }: DataFunctionArgs) {
	invariant(params.username, 'Missing username')
	const loggedInUserId = await getUserId(request)
	const user = await prisma.user.findUnique({
		where: { username: params.username },
	})
	if (!user) {
		throw new Response('not found', { status: 404 })
	}

	return json({
		displayName: user.name ?? user.username,
		isSelf: user.id === loggedInUserId,
	})
}

export default function UserRoute() {
	const data = useLoaderData<typeof loader>()
	const matches = useMatches()
	const lastMatch = matches[matches.length - 1]
	const onIndexPage = lastMatch.id.endsWith('index')

	return (
		<div className="mt-36 mb-48">
			{onIndexPage ? null : (
				<div className="container mx-auto flex justify-end">
					<div className="flex justify-between gap-6">
						{data.isSelf ? (
							<Form action="/logout" method="POST">
								<Button type="submit" size="pill" variant="secondary">
									Logout
								</Button>
							</Form>
						) : null}
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

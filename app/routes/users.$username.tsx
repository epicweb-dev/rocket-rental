import type { LoaderArgs } from '@remix-run/node'
import { json } from '@remix-run/node'
import {
	Form,
	Outlet,
	useCatch,
	useLoaderData,
	useParams,
} from '@remix-run/react'
import invariant from 'tiny-invariant'
import { getUserByUsername } from '~/models/user.server'
import { useOptionalUser } from '~/utils/misc'

export async function loader({ request, params }: LoaderArgs) {
	invariant(params.username, 'Missing username')
	const user = await getUserByUsername(params.username)
	if (!user) {
		throw new Response('not found', { status: 404 })
	}
	return json({ user })
}

export default function UserRoute() {
	const data = useLoaderData<typeof loader>()
	const user = useOptionalUser()
	const isOwnProfile = user?.id === data.user.id
	return (
		<div>
			<h1>User</h1>
			{isOwnProfile ? (
				<Form action="/logout" method="post">
					<button className="flex items-center justify-center rounded-md bg-blue-500 px-4 py-3 font-medium text-white hover:bg-blue-600">
						Logout of {user.name}
					</button>
				</Form>
			) : null}
			{data.user.imageUrl ? (
				<img
					src={data.user.imageUrl}
					alt={data.user.name ?? data.user.username}
				/>
			) : null}
			<pre>{JSON.stringify(data, null, 2)}</pre>
			<hr />
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

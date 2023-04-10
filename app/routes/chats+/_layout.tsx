import { json, type DataFunctionArgs } from '@remix-run/node'
import { Link, Outlet, useLoaderData } from '@remix-run/react'
import { requireUserId } from '~/utils/auth.server'
import { prisma } from '~/utils/db.server'
import { listify, useUser } from '~/utils/misc'

export async function loader({ request }: DataFunctionArgs) {
	const userId = await requireUserId(request)
	const chats = await prisma.chat.findMany({
		where: { users: { some: { id: userId } } },
		select: {
			id: true,
			users: {
				select: {
					id: true,
					name: true,
					username: true,
				},
			},
		},
	})
	return json({ chats })
}

export default function ChatsRoute() {
	const data = useLoaderData<typeof loader>()
	const user = useUser()
	return (
		<div>
			<h1 className="text-h1">Chats</h1>
			<details>
				<summary>Chats</summary>
				<pre>{JSON.stringify(data, null, 2)}</pre>
			</details>
			<ul>
				{data.chats.map(chat => (
					<li key={chat.id}>
						<Link to={chat.id}>
							{listify(
								chat.users.filter(u => u.id !== user.id),
								{ stringify: u => u.name ?? u.username },
							)}
						</Link>
					</li>
				))}
			</ul>
			<hr />
			<Outlet />
		</div>
	)
}

import { json, type DataFunctionArgs } from '@remix-run/node'
import { Outlet, useLoaderData } from '@remix-run/react'
import { requireUserId } from '~/utils/auth.server'
import { prisma } from '~/utils/db.server'

export async function loader({ request }: DataFunctionArgs) {
	const userId = await requireUserId(request)
	const chats = await prisma.chat.findMany({
		where: { users: { some: { id: userId } } },
		select: { id: true },
	})
	return json({ chats })
}

export default function ChatsRoute() {
	const data = useLoaderData<typeof loader>()
	return (
		<div>
			<h1>Chats</h1>
			<details>
				<summary>Chats</summary>
				<pre>{JSON.stringify(data, null, 2)}</pre>
			</details>
			<hr />
			<Outlet />
		</div>
	)
}

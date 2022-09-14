import type { LoaderArgs } from '@remix-run/node'
import { json } from '@remix-run/node'
import { Outlet, useCatch, useLoaderData, useParams } from '@remix-run/react'
import invariant from 'tiny-invariant'
import { prisma } from '~/db.server'
import { authenticator } from '~/services/auth.server'

export async function loader({ request, params }: LoaderArgs) {
	invariant(params.chatId, 'Missing chatId')
	const userId = await authenticator.isAuthenticated(request, {
		failureRedirect: `/login?redirectTo=${request.url}`,
	})
	const chat = await prisma.chat.findFirst({
		where: { id: params.chatId, users: { some: { id: userId } } },
		select: {
			id: true,
			users: { select: { id: true, name: true, imageUrl: true } },
			messages: { select: { id: true, senderId: true, content: true } },
		},
	})

	if (!chat) {
		throw new Response('not found', { status: 404 })
	}
	return json({ chat })
}

export default function ChatRoute() {
	const data = useLoaderData<typeof loader>()
	return (
		<div>
			<h2>Chat</h2>
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
		return <div>Chat "{params.starportId}" not found</div>
	}

	throw new Error(`Unexpected caught response with status: ${caught.status}`)
}

import type { ActionArgs, LoaderArgs } from '@remix-run/node'
import { json } from '@remix-run/node'
import {
	useCatch,
	useFetcher,
	useLoaderData,
	useParams,
} from '@remix-run/react'
import { useEffect, useRef } from 'react'
import invariant from 'tiny-invariant'
import { prisma } from '~/db.server'
import { requireUserId } from '~/services/auth.server'
import { chatEmitter, EVENTS } from '~/services/chat.server'
import { useEventSource, useRevalidator } from '~/utils/hooks'

export async function loader({ request, params }: LoaderArgs) {
	invariant(params.chatId, 'Missing chatId')
	const userId = await requireUserId(request)
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

export async function action({ request, params }: ActionArgs) {
	const userId = await requireUserId(request)
	invariant(params.chatId, 'Missing chatId')
	const formData = await request.formData()
	const { intent, content } = Object.fromEntries(formData)
	invariant(typeof content === 'string', 'content type invalid')

	switch (intent) {
		case 'send-message': {
			await prisma.message.create({
				data: {
					senderId: userId,
					chatId: params.chatId,
					content,
				},
				select: { id: true },
			})
			// TODO: add json patch as the message
			// https://www.npmjs.com/package/json8-patch
			chatEmitter.emit(EVENTS.NEW_MESSAGE, params.chatId)
			return json({ success: true })
		}
		default: {
			throw new Error(`Unsupported intent: ${intent}`)
		}
	}
}

export default function ChatRoute() {
	const { chatId } = useParams()
	invariant(chatId, 'Missing chatId')

	const data = useLoaderData<typeof loader>()
	const messageFetcher = useFetcher<typeof action>()
	const chatUpdateData = useEventSource(`/chats/${chatId}/events`)

	const revalidator = useRevalidator()
	const mounted = useRef(false)
	useEffect(() => {
		if (!mounted.current) {
			mounted.current = true
			return
		}
		revalidator.revalidate()
	}, [chatUpdateData, revalidator])

	return (
		<div>
			<h2>Chat</h2>
			<details>
				<summary>Chat data</summary>
				<pre>{JSON.stringify(data, null, 2)}</pre>
			</details>
			<hr />
			<ul className="flex flex-col">
				{data.chat.messages.map(message => {
					const sender = data.chat.users.find(
						user => user.id === message.senderId,
					)
					return (
						<li key={message.id} className="flex items-center">
							<img
								src={sender?.imageUrl ?? 'TODO: add default image'}
								alt={sender?.name ?? 'Unknown user'}
								className="h-8 w-8 rounded-full"
							/>
							<div className="ml-2">{message.content}</div>
						</li>
					)
				})}
			</ul>
			<hr />
			<messageFetcher.Form
				method="post"
				onSubmit={event => {
					const form = event.currentTarget
					requestAnimationFrame(() => {
						form.reset()
					})
				}}
			>
				<input
					type="text"
					name="content"
					placeholder="Type a message..."
					className="w-full"
				/>
				<button name="intent" value="send-message" type="submit">
					Send
				</button>
			</messageFetcher.Form>
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

export function ErrorBoundary({ error }: { error: Error }) {
	console.error(error)

	return <div>An unexpected error occurred: {error.message}</div>
}

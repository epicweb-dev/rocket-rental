import { json, type DataFunctionArgs } from '@remix-run/node'
import {
	Link,
	useFetcher,
	useLoaderData,
	useNavigation,
	useParams,
} from '@remix-run/react'
import { useSpinDelay } from 'spin-delay'
import { useState } from 'react'
import invariant from 'tiny-invariant'
import { GeneralErrorBoundary } from '~/components/error-boundary.tsx'
import { requireUserId } from '~/utils/auth.server.ts'
import { chatEmitter, EVENTS } from '~/utils/chat.server.ts'
import { prisma } from '~/utils/db.server.ts'
import { useEventSource } from '~/utils/hooks.ts'
import { getUserImgSrc, listify, useUser } from '~/utils/misc.ts'
import {
	isNewMessageChange,
	type Message,
	type NewMessageChange,
} from './$chatId.events.ts'
import { clsx } from 'clsx'

export async function loader({ request, params }: DataFunctionArgs) {
	invariant(params.chatId, 'Missing chatId')
	const userId = await requireUserId(request)
	const chat = await prisma.chat.findFirst({
		where: { id: params.chatId, users: { some: { id: userId } } },
		select: {
			id: true,
			users: {
				select: { id: true, username: true, name: true, imageId: true },
			},
			messages: { select: { id: true, senderId: true, content: true } },
		},
	})

	if (!chat) {
		throw new Response('not found', { status: 404 })
	}
	// type assertion-ish (is there a better way to do this?)
	// my goal is to ensure that the type we get from prisma for the messages
	// is the same as the one we get from the emitted changes
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	let messages: Array<Message> = chat.messages

	return json({ chat, timestamp: Date.now() })
}

export async function action({ request, params }: DataFunctionArgs) {
	const userId = await requireUserId(request)
	invariant(params.chatId, 'Missing chatId')
	const formData = await request.formData()
	const { intent, content } = Object.fromEntries(formData)
	invariant(typeof content === 'string', 'content type invalid')

	switch (intent) {
		case 'send-message': {
			const newMessage = await prisma.message.create({
				data: {
					senderId: userId,
					chatId: params.chatId,
					content,
				},
				select: { id: true, senderId: true, content: true },
			})
			// TODO: add json patch as the message
			// https://www.npmjs.com/package/json8-patch
			const change: NewMessageChange = {
				type: 'new',
				timestamp: Date.now(),
				message: newMessage,
			}
			chatEmitter.emit(`${EVENTS.NEW_MESSAGE}:${params.chatId}`, change)
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
	const user = useUser()
	const otherUsers = data.chat.users.filter(u => u.id !== user.id)
	const messageFetcher = useFetcher<typeof action>()
	const [changes, setChanges] = useState<Array<NewMessageChange>>([])

	const navigation = useNavigation()

	const showSpinner = useSpinDelay(navigation.state === 'loading', {
		delay: 200,
		minDuration: 300,
	})

	useEventSource(`/chats/${chatId}/events`, event => {
		let change: unknown
		try {
			change = JSON.parse(event.data)
		} catch (error) {
			console.error(`Unable to parse event data: ${event.data}`)
		}
		setChanges(changes => {
			if (isNewMessageChange(change)) {
				return [...changes, change]
			} else {
				console.error(`Cannot process change: ${change}`)
				return changes
			}
		})
	})

	const relevantChanges = changes.filter(
		change => change.timestamp > data.timestamp,
	)

	const messages = [...data.chat.messages]
	for (const change of relevantChanges) {
		if (change.type === 'new') {
			messages.push(change.message)
		} else {
			// TODO: Handle other change types
			console.error('Unknown change type', { change })
		}
	}

	return (
		<div className={clsx('flex flex-col', showSpinner ? 'opacity-50' : '')}>
			<div className="flex h-20 items-center justify-between border-b-[1.5px] border-b-night-400 px-8">
				<div className="flex items-center gap-4">
					<img
						className="h-12 w-12 rounded-full object-cover"
						src={getUserImgSrc(otherUsers[0]?.imageId)}
						alt={
							otherUsers[0]?.name ?? otherUsers[0]?.username ?? 'Unknown user'
						}
					/>
					<h2 className="text-body-md font-bold">
						{listify(otherUsers, { stringify: u => u.name ?? u.username })}
					</h2>
				</div>
			</div>
			<div className="flex flex-1 flex-col justify-between">
				<ul className="flex flex-1 flex-col gap-4 bg-night-600 px-8">
					{messages.map(message => {
						const sender = data.chat.users.find(
							user => user.id === message.senderId,
						)
						return (
							<li key={message.id} className="flex items-center">
								<Link to={`/users/${sender?.id}`}>
									<img
										src={getUserImgSrc(sender?.imageId)}
										alt={sender?.name ?? sender?.username ?? 'Unknown user'}
										className="h-8 w-8 rounded-full object-cover"
									/>
								</Link>
								<div className="ml-2 flex-1">{message.content}</div>
							</li>
						)
					})}
				</ul>
				<messageFetcher.Form
					method="POST"
					onSubmit={event => {
						const form = event.currentTarget
						requestAnimationFrame(() => {
							form.reset()
						})
					}}
					className="flex gap-3 border-t-[0.3px] border-t-night-400 bg-night-500 px-6 py-3"
				>
					<input
						type="text"
						name="content"
						placeholder="Type a message..."
						className="w-full rounded-full bg-night-600 px-4 py-2"
					/>
					<button name="intent" value="send-message" type="submit">
						<span title="Send">🚀</span>
					</button>
				</messageFetcher.Form>
			</div>
		</div>
	)
}

export function ErrorBoundary() {
	return (
		<GeneralErrorBoundary
			statusHandlers={{
				404: () => <p>Chat not found</p>,
			}}
		/>
	)
}

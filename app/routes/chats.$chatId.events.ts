import type { LoaderArgs } from '@remix-run/node'
import { prisma } from '~/db.server'
import { requireUserId } from '~/services/auth.server'
import { EVENTS, chatEmitter } from '~/services/chat.server'
import { eventStream } from '~/utils/event-stream.server'

export type Message = {
	id: string
	senderId: string
	content: string
}

export type NewMessageChange = {
	type: 'new'
	timestamp: number
	message: Message
}

export function isMessage(message: any): message is Message {
	return (
		message &&
		typeof message === 'object' &&
		typeof message.id === 'string' &&
		typeof message.senderId === 'string' &&
		typeof message.content === 'string'
	)
}

export function isNewMessageChange(change: any): change is NewMessageChange {
	return (
		change &&
		typeof change === 'object' &&
		change.type === 'new' &&
		typeof change.timestamp === 'number' &&
		isMessage(change.message)
	)
}

export async function loader({ request, params }: LoaderArgs) {
	const userId = await requireUserId(request)
	const hasAccess = await prisma.chat.findFirst({
		where: {
			id: params.chatId,
			users: { some: { id: userId } },
		},
		select: { id: true },
	})
	if (!hasAccess) {
		return new Response('Access denied', { status: 403 })
	}

	return eventStream(request, send => {
		function handler(message: unknown) {
			if (isNewMessageChange(message)) {
				send('message', JSON.stringify(message))
			}
		}
		const eventType = `${EVENTS.NEW_MESSAGE}:${params.chatId}`
		chatEmitter.addListener(eventType, handler)
		return () => {
			chatEmitter.removeListener(eventType, handler)
		}
	})
}

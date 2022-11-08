import type { LoaderArgs } from '@remix-run/node'
import { prisma } from '~/db.server'
import { requireUserId } from '~/services/auth.server'
import { EVENTS, chatEmitter } from '~/services/chat.server'
import { eventStream } from '~/utils/event-stream.server'

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
		function handler(message: string) {
			send('message', message)
		}
		chatEmitter.addListener(EVENTS.NEW_MESSAGE, handler)
		return () => {
			chatEmitter.removeListener(EVENTS.NEW_MESSAGE, handler)
		}
	})
}

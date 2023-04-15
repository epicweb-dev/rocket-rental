import { rest } from 'msw'
import { setupServer } from 'msw/node'
import closeWithGrace from 'close-with-grace'
import { z } from 'zod'
import { createFixture, requiredHeader } from './utils'

const miscHandlers = [
	rest.post(
		'https://api.mailgun.net/v3/:domain/messages',
		async (req, res, ctx) => {
			requiredHeader(req.headers, 'Authorization')
			const bodyRaw = Object.fromEntries(new URLSearchParams(await req.text()))
			const body = z
				.object({
					to: z.string(),
					from: z.string(),
					subject: z.string(),
					text: z.string(),
					html: z.string(),
				})
				.parse(bodyRaw)
			console.info('🔶 mocked email contents:', body)

			await createFixture('email', body.to, body)

			const randomId = '20210321210543.1.E01B8B612C44B41B'
			const id = `<${randomId}>@${req.params.domain}`
			return res(ctx.json({ id, message: 'Queued. Thank you.' }))
		},
	),
]

const server = setupServer(...miscHandlers)

server.listen({ onUnhandledRequest: 'warn' })
console.info('🔶 Mock server installed')

closeWithGrace(() => {
	server.close()
})

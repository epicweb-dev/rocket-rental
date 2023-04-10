import { rest } from 'msw'
import { setupServer } from 'msw/node'
import closeWithGrace from 'close-with-grace'
import { createFixture } from './utils'

const miscHandlers = [
	rest.post(
		'https://api.mailgun.net/v3/:domain/messages',
		async (req, res, ctx) => {
			const body = Object.fromEntries(new URLSearchParams(await req.text()))
			console.info('🔶 mocked email contents:', body)

			const { to } = body
			if (typeof to === 'string') {
				await createFixture('email', to, body)
			}
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

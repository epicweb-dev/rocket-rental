import { rest } from 'msw'
import { setupServer } from 'msw/node'
import { isE2E, readFixture, updateFixture } from './utils'

const miscHandlers = [
	rest.post(
		'https://api.mailgun.net/v3/:domain/messages',
		async (req, res, ctx) => {
			const body = Object.fromEntries(new URLSearchParams(await req.text()))
			console.info('🔶 mocked email contents:', body)

			if (isE2E && body.text) {
				const fixture = await readFixture()
				await updateFixture({
					email: {
						...fixture?.email,
						[body.to]: body,
					},
				})
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
if (isE2E) console.info('running in E2E mode')

process.once('SIGINT', () => server.close())
process.once('SIGTERM', () => server.close())

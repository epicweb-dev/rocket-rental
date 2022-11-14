import { PassThrough } from 'stream'
import path from 'path'
import fs from 'fs'
import type { EntryContext, HandleDataRequestFunction } from '@remix-run/node'
import { Response } from '@remix-run/node'
import { RemixServer } from '@remix-run/react'
import isbot from 'isbot'
import { renderToPipeableStream } from 'react-dom/server'
import { getFlyReplayResponse, getInstanceInfo } from './utils/fly.server'
import { getSession, sessionStorage } from './utils/session.server'
import invariant from 'tiny-invariant'

const ABORT_DELAY = 5000

export default async function handleRequest(
	request: Request,
	responseStatusCode: number,
	responseHeaders: Headers,
	remixContext: EntryContext,
) {
	const { currentInstance, primaryInstance } = await getInstanceInfo()

	responseHeaders.set('fly-region', process.env.FLY_REGION ?? 'unknown')
	responseHeaders.set('fly-app', process.env.FLY_APP_NAME ?? 'unknown')
	responseHeaders.set('fly-primary-instance', primaryInstance)
	responseHeaders.set('fly-instance', currentInstance)

	const maybeResponse = await handleTXID(request, responseHeaders)
	if (maybeResponse) return maybeResponse
	const callbackName = isbot(request.headers.get('user-agent'))
		? 'onAllReady'
		: 'onShellReady'

	return new Promise((resolve, reject) => {
		let didError = false

		const { pipe, abort } = renderToPipeableStream(
			<RemixServer context={remixContext} url={request.url} />,
			{
				[callbackName]: () => {
					const body = new PassThrough()

					responseHeaders.set('Content-Type', 'text/html')
					resolve(
						new Response(body, {
							headers: responseHeaders,
							status: didError ? 500 : responseStatusCode,
						}),
					)

					pipe(body)
				},
				onShellError: (err: unknown) => {
					reject(err)
				},
				onError: (error: unknown) => {
					didError = true

					console.error(error)
				},
			},
		)

		setTimeout(abort, ABORT_DELAY)
	})
}

export async function handleDataRequest(
	response: Response,
	{ request }: Parameters<HandleDataRequestFunction>[1],
) {
	const { currentInstance, primaryInstance } = await getInstanceInfo()
	response.headers.set('fly-region', process.env.FLY_REGION ?? 'unknown')
	response.headers.set('fly-app', process.env.FLY_APP_NAME ?? 'unknown')
	response.headers.set('fly-primary-instance', primaryInstance)
	response.headers.set('fly-instance', currentInstance)
	const maybeResponse = await handleTXID(request, response.headers)
	if (maybeResponse) return maybeResponse
	return response
}

async function handleTXID(request: Request, responseHeaders: Headers) {
	const { primaryInstance, currentIsPrimary } = await getInstanceInfo()

	if (process.env.FLY) {
		const session = await getSession(request.headers.get('Cookie'))
		if (request.method === 'GET' || request.method === 'HEAD') {
			const sessionTXID = session.get('txid')

			if (sessionTXID) {
				if (!currentIsPrimary) {
					const txid = await getTXID()
					if (!txid) return
					const localTXNumber = parseInt(txid, 16)
					const sessionTXNumber = parseInt(sessionTXID, 16)
					if (sessionTXNumber <= localTXNumber) {
						// TODO: change all this logic to use the middleware feature instead
						// so we can just wait for the localTXNumber to catch up
						// https://github.com/remix-run/react-router/issues/9566
						return await getFlyReplayResponse(primaryInstance)
					} else {
						session.unset('txid')
						responseHeaders.append(
							'Set-Cookie',
							await sessionStorage.commitSession(session),
						)
					}
				}
			}
		} else if (request.method === 'POST') {
			if (currentIsPrimary) {
				const txid = await getTXID()
				if (!txid) return

				session.set('txid', txid)
				responseHeaders.append(
					'Set-Cookie',
					await sessionStorage.commitSession(session),
				)
			}
		} else {
			return new Response(null, { status: 405 })
		}
	}
}

async function getTXID() {
	const { FLY_LITEFS_DIR } = process.env
	invariant(FLY_LITEFS_DIR, 'FLY_LITEFS_DIR is not defined')
	const dbPos = await fs.promises
		.readFile(path.join(FLY_LITEFS_DIR, `sqlite.db-pos`), 'utf-8')
		.catch(() => '0')
	return dbPos.trim().split('/')[0]
}

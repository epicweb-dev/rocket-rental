import fs from 'fs'
import os from 'os'
import path from 'path'
import invariant from 'tiny-invariant'
import { getSession } from './session.server'

export async function ensurePrimary() {
	const { currentInstance, primaryInstance, currentIsPrimary } =
		await getInstanceInfo()
	if (process.env.FLY && !currentIsPrimary) {
		console.log(
			`Instance (${currentInstance}) in ${process.env.FLY_REGION} is not primary (primary is: ${primaryInstance}), sending fly replay response`,
		)
		throw await getFlyReplayResponse(primaryInstance)
	}
}

export async function getInstanceInfo() {
	const currentInstance = os.hostname()
	if (!process.env.FLY) {
		return {
			primaryInstance: currentInstance,
			currentInstance,
			currentIsPrimary: true,
		}
	}

	let primaryInstance
	const { FLY_LITEFS_DIR } = process.env
	invariant(FLY_LITEFS_DIR, 'FLY_LITEFS_DIR is not defined')
	try {
		primaryInstance = await fs.promises.readFile(
			path.join(FLY_LITEFS_DIR, '.primary'),
			'utf8',
		)
		primaryInstance = primaryInstance.trim()
	} catch (error: unknown) {
		primaryInstance = currentInstance
	}
	return {
		primaryInstance,
		currentInstance,
		currentIsPrimary: currentInstance === primaryInstance,
	}
}

export async function getFlyReplayResponse(instance?: string) {
	return new Response('Fly Replay', {
		status: 409,
		headers: {
			'fly-replay': `instance=${
				instance ?? (await getInstanceInfo()).primaryInstance
			}`,
		},
	})
}

export async function handleTXID(request: Request, responseHeaders: Headers) {
	const { primaryInstance, currentIsPrimary } = await getInstanceInfo()

	if (!process.env.FLY) return

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

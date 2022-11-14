import fs from 'fs'
import os from 'os'
import path from 'path'
import invariant from 'tiny-invariant'

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

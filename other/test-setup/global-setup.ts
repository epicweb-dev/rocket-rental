import { spawn } from 'child_process'
import fsExtra from 'fs-extra'
import { BASE_DATABASE_PATH, BASE_DATABASE_URL } from './paths'

export async function setup() {
	await ensureDbReady()
	return async function teardown() {}
}

async function ensureDbReady() {
	const command = 'npx prisma migrate reset --force --skip-seed --skip-generate'

	if (!(await fsExtra.pathExists(BASE_DATABASE_PATH))) {
		const child = spawn(command, {
			shell: true,
			stdio: 'inherit',
			env: {
				...process.env,
				DATABASE_PATH: BASE_DATABASE_PATH,
				DATABASE_URL: BASE_DATABASE_URL,
			},
		})
		return new Promise((resolve, reject) => {
			child.on('error', reject)
			child.on('exit', resolve)
		})
	}
}

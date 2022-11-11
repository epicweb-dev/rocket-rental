import './init-env-vars'
import { spawn } from 'child_process'

export async function setup() {
	await ensureDbReady()
	return async function teardown() {}
}

async function ensureDbReady() {
	const command = 'npx prisma migrate reset --force --skip-seed --skip-generate'
	const child = spawn(command, { shell: true, stdio: 'inherit' })
	return new Promise((resolve, reject) => {
		child.on('error', reject)
		child.on('exit', resolve)
	})
}

import { spawn } from 'child_process'
import fs from 'fs/promises'

export async function setup() {
	await ensureDbReady()
	return async function teardown() {}
}

async function ensureDbReady() {
	const command = 'npx prisma migrate reset --force --skip-seed --skip-generate'
	process.env.DATABASE_PATH = `./prisma/test/base.db`
	process.env.DATABASE_URL = `file:./test/base.db?connection_limit=1`

	const exists = await fs.access(process.env.DATABASE_PATH).then(
		() => true,
		() => false,
	)

	if (!exists) {
		const child = spawn(command, { shell: true, stdio: 'inherit' })
		return new Promise((resolve, reject) => {
			child.on('error', reject)
			child.on('exit', resolve)
		})
	}
}

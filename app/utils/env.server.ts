import invariant from 'tiny-invariant'

declare global {
	namespace NodeJS {
		interface ProcessEnv {
			DATABASE_URL: string
			SESSION_SECRET: string
		}
	}
}

export function init() {
	const requiredEnvs = ['DATABASE_URL', 'SESSION_SECRET'] as const
	for (const env of requiredEnvs) {
		invariant(process.env[env], `${env} is required`)
	}
}

import invariant from 'tiny-invariant'

declare global {
	namespace NodeJS {
		interface ProcessEnv {
			DATABASE_URL: string
			SESSION_SECRET: string
			ENCRYPTION_SECRET: string
			MAILGUN_SENDING_KEY: string
			MAILGUN_DOMAIN: string
		}
	}
}

export function init() {
	const requiredEnvs = [
		'DATABASE_URL',
		'SESSION_SECRET',
		'ENCRYPTION_SECRET',
		'MAILGUN_SENDING_KEY',
		'MAILGUN_DOMAIN',
	] as const
	for (const env of requiredEnvs) {
		invariant(process.env[env], `${env} is required`)
	}
}

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
	const requiredServerEnvs = [
		'NODE_ENV',
		'DATABASE_URL',
		'SESSION_SECRET',
		'ENCRYPTION_SECRET',
		'MAILGUN_SENDING_KEY',
		'MAILGUN_DOMAIN',
	] as const
	for (const env of requiredServerEnvs) {
		invariant(process.env[env], `${env} is required`)
	}
}

/**
 * This is used in both `entry.server.ts` and `root.tsx` to ensure that
 * the environment variables are set and globally available before the app is
 * started.
 *
 * NOTE: Do *not* add any environment variables in here that you do not wish to
 * be included in the client.
 * @returns all public ENV variables
 */
export function getEnv() {
	invariant(process.env.NODE_ENV, 'NODE_ENV should be defined')

	return {
		MODE: process.env.NODE_ENV,
	}
}

type ENV = ReturnType<typeof getEnv>

declare global {
	var ENV: ENV
	interface Window {
		ENV: ENV
	}
}

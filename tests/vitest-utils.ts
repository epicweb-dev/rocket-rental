import { authenticator } from '~/utils/auth.server.ts'
import { commitSession, getSession } from '~/utils/session.server.ts'

export const BASE_URL = 'https://rocketrental.space'

export async function getUserSetCookieHeader(
	user: { id: string },
	existingCookie?: string,
) {
	const session = await getSession(existingCookie)
	session.set(authenticator.sessionKey, user.id)
	const setCookieHeader = await commitSession(session)
	return setCookieHeader
}

export {
	insertImage,
	createImageFromFile,
	fixturesDirPath,
} from 'tests/db-utils.ts'

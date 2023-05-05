import { authenticator } from '~/utils/auth.server.ts'
import { commitSession, getSession } from '~/utils/session.server.ts'

export const BASE_URL = 'https://rocketrental.space'

export async function getUserCookie(
	user: { id: string },
	existingCookie?: string,
) {
	const session = await getSession(existingCookie)
	session.set(authenticator.sessionKey, user.id)
	const cookie = await commitSession(session)
	return cookie
}

import fs from 'fs'
import { type PrismaClient } from '@prisma/client'
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

export async function insertImage(
	prisma: PrismaClient,
	imageUrl: string,
): Promise<string> {
	const image = await prisma.image.create({
		data: await createImageFromFile(imageUrl),
		select: { fileId: true },
	})
	return image.fileId
}

export async function createImageFromFile(imageUrl: string) {
	return {
		contentType: 'image/jpeg',
		file: {
			create: {
				blob: await fs.promises.readFile(`./tests/fixtures/${imageUrl}`),
			},
		},
	}
}

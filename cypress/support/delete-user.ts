// Use this to delete a user by their email
// Simply call this with:
// npx ts-node --require tsconfig-paths/register ./cypress/support/delete-user.ts username
// and that user will get deleted

import { PrismaClientKnownRequestError } from '@prisma/client/runtime'
import { installGlobals } from '@remix-run/node'

import { prisma } from '~/db.server'

installGlobals()

async function deleteUser(username: string) {
	if (!username) {
		throw new Error('email required for login')
	}

	try {
		await prisma.user.delete({ where: { username } })
	} catch (error) {
		if (
			error instanceof PrismaClientKnownRequestError &&
			error.code === 'P2025'
		) {
			console.log('User not found, so no need to delete')
		} else {
			throw error
		}
	} finally {
		await prisma.$disconnect()
	}
}

deleteUser(process.argv[2])

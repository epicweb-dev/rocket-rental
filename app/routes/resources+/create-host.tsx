import { type DataFunctionArgs, json } from '@remix-run/node'
import { requireUserId } from '~/utils/auth.server.ts'
import { prisma } from '~/utils/db.server.ts'

export const ROUTE_PATH = '/resources/create-host'

export async function action({ request }: DataFunctionArgs) {
	const userId = await requireUserId(request)
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { id: true, host: { select: { userId: true } } },
	})
	if (!user) {
		return json({ status: 'error', errors: ['User not found'] } as const, {
			status: 404,
		})
	}
	if (user.host) {
		return json(
			{ status: 'error', errors: ['User is already a host'] } as const,
			{ status: 400 },
		)
	}
	try {
		await prisma.host.create({
			data: { userId: user.id },
		})
		return json({ status: 'success' } as const)
	} catch (error) {
		console.error(error)
		return json({
			status: 'error',
			errors: ['An unknown error occurred. Try again?'],
		} as const)
	}
}

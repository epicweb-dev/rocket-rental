import { type DataFunctionArgs, json } from '@remix-run/node'
import { requireUserId } from '~/utils/auth.server'
import { prisma } from '~/utils/db.server'

export const ROUTE_PATH = '/resources/create-renter'

export async function action({ request }: DataFunctionArgs) {
	const userId = await requireUserId(request)
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { id: true, renter: { select: { userId: true } } },
	})
	if (!user) {
		return json({ status: 'error', errors: ['User not found'] } as const, {
			status: 404,
		})
	}
	if (user.renter) {
		return json(
			{ status: 'error', errors: ['User is already a renter'] } as const,
			{ status: 400 },
		)
	}
	try {
		await prisma.renter.create({
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

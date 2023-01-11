import { z } from 'zod'
import { json } from '@remix-run/node'
import { requireUserId } from '~/utils/auth.server'
import { prisma } from '~/utils/db.server'
import { type Prisma, type PrismaClient } from '@prisma/client'

export const ShipFormSchema = z.object({
	name: z.string().min(2).max(60),
	description: z.string().min(20).max(10_000),
	capacity: z.number().min(1).max(100),
	dailyCharge: z.number().min(1).max(100_000),
	modelId: z.string().cuid({ message: 'Invalid Model' }),
	starportId: z.string().cuid({ message: 'Invalid Starport' }),
	imageFile: z.instanceof(File),
})

export const LooseShipFormSchema = ShipFormSchema.partial()

export const MAX_SIZE = 1024 * 1024 * 5 // 5MB

export function validateContentLength(request: Request) {
	const contentLength = Number(request.headers.get('Content-Length'))
	if (
		contentLength &&
		Number.isFinite(contentLength) &&
		contentLength > MAX_SIZE
	) {
		return json(
			{
				status: 'error',
				errors: {
					formErrors: [],
					fieldErrors: { imageFile: ['File too large'] },
				},
			} as const,
			{ status: 400 },
		)
	}
}

export async function requireHost(request: Request) {
	const userId = await requireUserId(request)
	const host = await prisma.host.findFirst({
		where: { userId },
		select: { userId: true },
	})
	if (!host) {
		throw new Response('unauthorized', { status: 403 })
	}
	return host
}

export async function insertImage(
	client: PrismaClient | Prisma.TransactionClient,
	imageFile: File,
) {
	return client.image.create({
		select: { fileId: true },
		data: {
			contentType: imageFile.type,
			file: {
				create: {
					blob: Buffer.from(await imageFile.arrayBuffer()),
				},
			},
		},
	})
}

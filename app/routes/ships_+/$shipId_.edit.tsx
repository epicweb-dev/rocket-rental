import {
	json,
	redirect,
	unstable_createMemoryUploadHandler,
	unstable_parseMultipartFormData,
	type DataFunctionArgs,
} from '@remix-run/node'
import { useActionData, useLoaderData } from '@remix-run/react'
import invariant from 'tiny-invariant'
import { prisma } from '~/utils/db.server'
import { getFieldsFromSchema, preprocessFormData } from '~/utils/forms'
import ShipEditForm from './__shared'
import {
	insertImage,
	LooseShipFormSchema,
	MAX_SIZE,
	requireHost,
	validateContentLength,
} from './__shared.server'

export async function loader({ request, params }: DataFunctionArgs) {
	invariant(params.shipId, 'Missing shipId')
	const host = await requireHost(request)
	const ship = await prisma.ship.findFirst({
		where: { id: params.shipId, hostId: host.userId },
		select: {
			model: {
				select: {
					id: true,
					name: true,
					imageId: true,
					brand: {
						select: {
							id: true,
							name: true,
							imageId: true,
						},
					},
				},
			},
			starport: {
				select: {
					id: true,
					name: true,
				},
			},
			name: true,
			description: true,
			imageId: true,
			capacity: true,
			dailyCharge: true,
		},
	})
	if (!ship) {
		throw new Response('not found', { status: 404 })
	}
	return json({
		ship: {
			...ship,
			starport: { id: ship.starport.id, displayName: ship.starport.name },
		},
		fieldMetadata: getFieldsFromSchema(LooseShipFormSchema),
	})
}

export async function action({ request, params }: DataFunctionArgs) {
	invariant(params.shipId, 'Missing shipId')
	const host = await requireHost(request)

	const tooBigResponse = validateContentLength(request)
	if (tooBigResponse) return tooBigResponse

	const formData = await unstable_parseMultipartFormData(
		request,
		unstable_createMemoryUploadHandler({ maxPartSize: MAX_SIZE }),
	)
	const result = LooseShipFormSchema.safeParse(
		preprocessFormData(formData, LooseShipFormSchema),
	)
	if (!result.success) {
		return json({ status: 'error', errors: result.error.flatten() } as const, {
			status: 400,
		})
	}
	const { imageFile, ...shipData } = result.data

	const hasImageFile = imageFile?.size && imageFile.size > 0

	const previousImage = hasImageFile
		? await prisma.user.findUnique({
				where: { id: params.shipId },
				select: { imageId: true },
		  })
		: undefined

	const ship = await prisma.$transaction(async transactionClient => {
		const newImage = hasImageFile
			? await insertImage(transactionClient, imageFile)
			: null

		const ship = await transactionClient.ship.update({
			where: { id: params.shipId },
			data: {
				hostId: host.userId,
				imageId: newImage ? newImage.fileId : undefined,
				...shipData,
			},
		})

		return ship
	})

	if (previousImage?.imageId) {
		void prisma.image
			.delete({
				where: { fileId: previousImage.imageId },
			})
			.catch(error => {
				console.error(`Error trying to delete a previous image`, error)
				// don't fail the request though...
			})
	}

	return redirect(`/ships/${ship.id}`)
}

export default function ShipEditRoute() {
	const data = useLoaderData<typeof loader>()
	const actionData = useActionData<typeof action>()
	return (
		<div className="container m-auto">
			<h1>Ship Edit</h1>

			<ShipEditForm data={data} actionData={actionData} />
		</div>
	)
}

export { CatchBoundary } from './__shared'

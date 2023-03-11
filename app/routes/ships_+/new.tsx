import {
	json,
	redirect,
	unstable_createMemoryUploadHandler,
	unstable_parseMultipartFormData,
	type DataFunctionArgs,
} from '@remix-run/node'
import { useActionData, useLoaderData } from '@remix-run/react'
import { prisma } from '~/utils/db.server'
import { getFieldsFromSchema, preprocessFormData } from '~/utils/forms'
import ShipEditForm from './__shared'
import {
	insertImage,
	MAX_SIZE,
	requireHost,
	ShipFormSchema,
	validateContentLength,
} from './__shared.server'

export async function loader({ request }: DataFunctionArgs) {
	await requireHost(request)
	return json({
		ship: null,
		fieldMetadata: getFieldsFromSchema(ShipFormSchema),
	})
}

export async function action({ request }: DataFunctionArgs) {
	const host = await requireHost(request)

	const tooBigResponse = validateContentLength(request)
	if (tooBigResponse) return tooBigResponse

	const formData = await unstable_parseMultipartFormData(
		request,
		unstable_createMemoryUploadHandler({ maxPartSize: MAX_SIZE }),
	)
	const result = ShipFormSchema.safeParse(
		preprocessFormData(formData, ShipFormSchema),
	)
	if (!result.success) {
		return json({ status: 'error', errors: result.error.flatten() } as const, {
			status: 400,
		})
	}
	const { imageFile, ...shipData } = result.data

	const hasImageFile = imageFile?.size && imageFile.size > 0

	const ship = await prisma.$transaction(async transactionClient => {
		const newImage = hasImageFile
			? await insertImage(transactionClient, imageFile)
			: null

		const ship = await transactionClient.ship.create({
			data: {
				hostId: host.userId,
				imageId: newImage ? newImage.fileId : undefined,
				...shipData,
			},
		})
		return ship
	})

	return redirect(`/ships/${ship.id}`)
}

export default function NewShipRoute() {
	const data = useLoaderData<typeof loader>()
	const actionData = useActionData<typeof action>()
	return (
		<div className="container m-auto">
			<h1>Ship Edit</h1>

			<ShipEditForm data={data} actionData={actionData} />
		</div>
	)
}

export { ErrorBoundary } from './__shared'

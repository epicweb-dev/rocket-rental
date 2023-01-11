import {
	type DataFunctionArgs,
	unstable_createMemoryUploadHandler,
	unstable_parseMultipartFormData,
} from '@remix-run/node'
import { redirect } from '@remix-run/node'
import { json } from '@remix-run/node'
import {
	Form,
	Link,
	useActionData,
	useCatch,
	useLoaderData,
} from '@remix-run/react'
import { useState } from 'react'
import { requireUserId } from '~/utils/auth.server'
import { prisma } from '~/utils/db.server'
import { BrandCombobox } from '~/routes/resources+/brand-combobox'
import { ModelCombobox } from '~/routes/resources+/model-combobox'
import { StarportCombobox } from '~/routes/resources+/starport-combobox'
import { z } from 'zod'
import {
	getFieldMetadatas,
	getFields,
	getFormProps,
	preprocessFormData,
} from '~/utils/forms'

const ShipFormSchema = z.object({
	name: z.string().min(2).max(60),
	description: z.string().min(20).max(10_000),
	capacity: z.number().min(1).max(100),
	dailyCharge: z.number().min(1).max(100_000),
	modelId: z.string().cuid({ message: 'Invalid Model' }),
	starportId: z.string().cuid({ message: 'Invalid Starport' }),
	imageFile: z.instanceof(File),
})

export async function loader({ request }: DataFunctionArgs) {
	const userId = await requireUserId(request)
	const host = await prisma.host.findFirst({
		where: { userId },
		select: { userId: true },
	})
	if (!host) {
		throw new Response('unauthorized', { status: 403 })
	}
	return json({ fieldMetadata: getFieldMetadatas(ShipFormSchema) })
}

const MAX_SIZE = 1024 * 1024 * 5 // 5MB

export async function action({ request }: DataFunctionArgs) {
	const userId = await requireUserId(request)
	const host = await prisma.host.findFirst({
		where: { userId },
		select: { userId: true },
	})
	if (!host) {
		throw new Response('unauthorized', { status: 403 })
	}
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
	const {
		name,
		description,
		capacity,
		dailyCharge,
		modelId,
		starportId,
		imageFile,
	} = result.data

	const hasImageFile = imageFile?.size && imageFile.size > 0

	const ship = await prisma.$transaction(async transactionClient => {
		const newImage = hasImageFile
			? await transactionClient.image.create({
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
			: null

		const ship = await transactionClient.ship.create({
			data: {
				hostId: host.userId,
				name,
				description,
				imageId: newImage ? newImage.fileId : undefined,
				capacity: Number(capacity),
				dailyCharge: Number(dailyCharge),
				modelId: modelId,
				starportId: starportId,
			},
		})
		return ship
	})

	return redirect(`/ships/${ship.id}`)
}

const labelClassName = 'block text-sm font-medium text-gray-700'
const inputClassName = 'w-full rounded border border-gray-500 px-2 py-1 text-lg'
const fieldClassName = 'flex gap-1 flex-col'

export default function NewShipRoute() {
	const data = useLoaderData<typeof loader>()
	const actionData = useActionData<typeof action>()
	const fields = getFields(
		data.fieldMetadata,
		actionData?.status === 'error' ? actionData.errors.fieldErrors : undefined,
	)
	const form = getFormProps({
		name: 'ship-form',
		errors:
			actionData?.status === 'error' ? actionData.errors.formErrors : undefined,
	})
	const [selectedStarport, setSelectedStarport] = useState<{
		id: string
		displayName: string
	} | null>(null)
	const [selectedModel, setSelectedModel] = useState<{
		id: string
		name: string
		imageId: string
	} | null>(null)
	const [selectedBrand, setSelectedBrand] = useState<{
		id: string
		name: string
		imageId: string
	} | null>(null)

	return (
		<div className="container m-auto">
			<h1>Create A New Ship</h1>
			<Form
				method="post"
				className="flex flex-col gap-4"
				encType="multipart/form-data"
				noValidate
				{...form.props}
			>
				<div className={fieldClassName}>
					<label className={labelClassName} {...fields.imageFile.labelProps}>
						Set Ship Photo
					</label>
					<input
						className={inputClassName}
						{...fields.imageFile.props}
						type="file"
					/>
					{fields.imageFile.errorUI}
				</div>
				<div className={fieldClassName}>
					<label className={labelClassName} {...fields.name.labelProps}>
						Name
					</label>
					<input className={inputClassName} {...fields.name.props} />
					{fields.name.errorUI}
				</div>
				<div className={fieldClassName}>
					<label className={labelClassName} {...fields.description.labelProps}>
						Description
					</label>
					<textarea className={inputClassName} {...fields.description.props} />
					{fields.description.errorUI}
				</div>
				<BrandCombobox
					selectedItem={selectedBrand}
					onChange={newBrand => {
						setSelectedBrand(newBrand ?? null)
					}}
				/>
				<ModelCombobox
					selectedItem={selectedModel}
					brandIds={selectedBrand ? [selectedBrand.id] : []}
					onChange={newModel => {
						setSelectedModel(newModel ?? null)
					}}
				/>
				{selectedModel?.id ? (
					<input
						value={selectedModel?.id ?? ''}
						{...fields.modelId.props}
						type="hidden"
					/>
				) : null}
				{fields.modelId.errorUI}
				{/* TODO: handle image upload */}
				<div className={fieldClassName}>
					<label className={labelClassName} {...fields.capacity.labelProps}>
						Capacity
					</label>
					<input className={inputClassName} {...fields.capacity.props} />
					{fields.capacity.errorUI}
				</div>
				<div className={fieldClassName}>
					<label className={labelClassName} {...fields.dailyCharge.labelProps}>
						Daily Charge
					</label>
					<input className={inputClassName} {...fields.dailyCharge.props} />
					{fields.dailyCharge.errorUI}
				</div>
				<StarportCombobox
					selectedItem={selectedStarport}
					geolocation={null}
					onChange={newStarport => {
						setSelectedStarport(newStarport ?? null)
					}}
				/>
				{selectedStarport?.id ? (
					<input
						value={selectedStarport.id ?? ''}
						{...fields.starportId.props}
						type="hidden"
					/>
				) : null}
				{fields.starportId.errorUI}

				{form.errorUI}

				<button type="submit">Save</button>
			</Form>
			<pre>{JSON.stringify(data, null, 2)}</pre>
		</div>
	)
}

export function CatchBoundary() {
	const caught = useCatch()

	if (caught.status === 403) {
		return (
			<div>
				You are not a host. You must <Link to="/me">visit</Link> your profile
				page to create your host profile first.
			</div>
		)
	}

	throw new Error(`Unexpected caught response with status: ${caught.status}`)
}

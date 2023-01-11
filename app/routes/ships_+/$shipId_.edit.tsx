import {
	type DataFunctionArgs,
	unstable_createMemoryUploadHandler,
	unstable_parseMultipartFormData,
} from '@remix-run/node'
import { redirect } from '@remix-run/node'
import { json } from '@remix-run/node'
import {
	Form,
	useActionData,
	useCatch,
	useLoaderData,
	useParams,
} from '@remix-run/react'
import { useState } from 'react'
import { z } from 'zod'
import invariant from 'tiny-invariant'
import { requireUserId } from '~/utils/auth.server'
import { prisma } from '~/utils/db.server'
import { BrandCombobox } from '~/routes/resources+/brand-combobox'
import { ModelCombobox } from '~/routes/resources+/model-combobox'
import { StarportCombobox } from '~/routes/resources+/starport-combobox'
import {
	getFieldMetadatas,
	getFields,
	getFormProps,
	preprocessFormData,
} from '~/utils/forms'
import { getShipImgSrc } from '~/utils/misc'

const ShipFormSchema = z.object({
	name: z.string().min(2).max(60).optional(),
	description: z.string().min(20).max(10_000).optional(),
	capacity: z.number().min(1).max(100).optional(),
	dailyCharge: z.number().min(1).max(100_000).optional(),
	modelId: z.string().cuid({ message: 'Invalid Model' }).optional(),
	starportId: z.string().cuid({ message: 'Invalid Starport' }).optional(),
	imageFile: z.instanceof(File).optional(),
})

export async function loader({ request, params }: DataFunctionArgs) {
	invariant(params.shipId, 'Missing shipId')
	const userId = await requireUserId(request)
	const ship = await prisma.ship.findFirst({
		where: { id: params.shipId, hostId: userId },
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
		fieldMetadata: getFieldMetadatas(ShipFormSchema),
	})
}

const MAX_SIZE = 1024 * 1024 * 5 // 5MB

export async function action({ request, params }: DataFunctionArgs) {
	invariant(params.shipId, 'Missing shipId')
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

	const previousImage = hasImageFile
		? await prisma.user.findUnique({
				where: { id: params.shipId },
				select: { imageId: true },
		  })
		: undefined

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

		const ship = await transactionClient.ship.update({
			where: { id: params.shipId },
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

const labelClassName = 'block text-sm font-medium text-gray-700'
const inputClassName = 'w-full rounded border border-gray-500 px-2 py-1 text-lg'
const fieldClassName = 'flex gap-1 flex-col'

export default function ShipEditRoute() {
	const data = useLoaderData<typeof loader>()
	const actionData = useActionData<typeof action>()
	const form = getFormProps({
		name: 'ship-edit',
		errors: actionData?.errors?.formErrors,
	})
	const fields = getFields(data.fieldMetadata, actionData?.errors?.fieldErrors)
	const [selectedStarport, setSelectedStarport] = useState<
		typeof data.ship.starport | null
	>(data.ship.starport)
	const [selectedModel, setSelectedModel] = useState<{
		id: string
		name: string
		imageId: string
	} | null>(data.ship.model)
	const [selectedBrand, setSelectedBrand] = useState<
		typeof data.ship.model.brand | null
	>(data.ship.model.brand)

	return (
		<div className="container m-auto">
			<h1>Ship Edit</h1>
			<Form
				method="post"
				className="flex flex-col gap-4"
				encType="multipart/form-data"
				noValidate
				{...form.props}
			>
				<div className={fieldClassName}>
					<img
						src={getShipImgSrc(data.ship.imageId)}
						alt={data.ship.name}
						className="h-24 w-24 rounded-full object-cover"
					/>
					<label className={labelClassName} {...fields.imageFile.labelProps}>
						{data.ship.imageId ? 'Change Ship Photo' : 'Set Ship Photo'}
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
					<input
						className={inputClassName}
						defaultValue={data.ship.name}
						{...fields.name.props}
					/>
					{fields.name.errorUI}
				</div>
				<div className={fieldClassName}>
					<label className={labelClassName} {...fields.description.labelProps}>
						Description
					</label>
					<textarea
						className={inputClassName}
						defaultValue={data.ship.description}
						{...fields.description.props}
					/>
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
					<input
						className={inputClassName}
						defaultValue={data.ship.capacity}
						{...fields.capacity.props}
					/>
					{fields.capacity.errorUI}
				</div>
				<div className={fieldClassName}>
					<label className={labelClassName} {...fields.dailyCharge.labelProps}>
						Daily Charge
					</label>
					<input
						className={inputClassName}
						defaultValue={data.ship.dailyCharge}
						{...fields.dailyCharge.props}
					/>
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
	const params = useParams()

	if (caught.status === 404) {
		return <div>Ship "{params.shipId}" not found</div>
	}

	throw new Error(`Unexpected caught response with status: ${caught.status}`)
}

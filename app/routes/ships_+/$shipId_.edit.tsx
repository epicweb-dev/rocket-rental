import type { DataFunctionArgs } from '@remix-run/node'
import { redirect } from '@remix-run/node'
import { json } from '@remix-run/node'
import { Form, useCatch, useLoaderData, useParams } from '@remix-run/react'
import { useState } from 'react'
import invariant from 'tiny-invariant'
import { requireUserId } from '~/utils/auth.server'
import { prisma } from '~/utils/db.server'
import { BrandCombobox } from '~/routes/resources+/brand-combobox'
import { ModelCombobox } from '~/routes/resources+/model-combobox'
import { StarportCombobox } from '~/routes/resources+/starport-combobox'

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
	})
}

export async function action({ request, params }: DataFunctionArgs) {
	const userId = await requireUserId(request)
	const ship = await prisma.ship.findFirst({
		where: { id: params.shipId, hostId: userId },
		select: { id: true },
	})
	if (!ship) {
		throw new Response('not found', { status: 404 })
	}
	const formData = await request.formData()
	const { name, description, capacity, dailyCharge, modelId, starportId } =
		Object.fromEntries(formData)

	invariant(typeof name === 'string', 'name type invalid')
	invariant(typeof description === 'string', 'description type invalid')
	invariant(typeof capacity === 'string', 'capacity type invalid')
	invariant(typeof dailyCharge === 'string', 'dailyCharge type invalid')
	invariant(typeof modelId === 'string', 'modelId type invalid')
	invariant(typeof starportId === 'string', 'starportId type invalid')

	// const errors = {
	// 	username: validateUsername(username),
	// 	password: validatePassword(password),
	// }
	// const hasErrors = Object.values(errors).some(Boolean)
	// if (hasErrors) {
	// 	return json({ errors }, { status: 400 })
	// }

	await prisma.ship.update({
		where: { id: ship.id },
		data: {
			name,
			description,
			// TODO: handle image upload
			capacity: Number(capacity),
			dailyCharge: Number(dailyCharge),
			modelId: modelId,
			starportId: starportId,
		},
	})

	return redirect(`/ships/${ship.id}`)
}

export default function ShipEditRoute() {
	const data = useLoaderData<typeof loader>()
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
		<div>
			<h1>Ship Edit</h1>
			<Form method="post">
				<label>
					Name
					<input
						className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
						type="text"
						name="name"
						defaultValue={data.ship.name}
					/>
				</label>
				<label>
					Description
					<input
						className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
						type="text"
						name="description"
						defaultValue={data.ship.description}
					/>
				</label>
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
				{selectedModel ? (
					<input type="hidden" name="modelId" value={selectedModel.id ?? ''} />
				) : null}
				{/* TODO: figure out image upload */}
				{/* <label>
					Image URL
					<input
						className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
						type="text"
						name="imageId"
						defaultValue={data.ship.imageId}
					/>
				</label> */}
				<label>
					Capacity
					<input
						className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
						type="number"
						name="capacity"
						min="1"
						max="10"
						defaultValue={data.ship.capacity}
					/>
				</label>
				<label>
					Daily Charge
					<input
						className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
						type="number"
						min="0"
						max="1000"
						name="dailyCharge"
						defaultValue={data.ship.dailyCharge}
					/>
				</label>
				<StarportCombobox
					selectedItem={selectedStarport}
					geolocation={null}
					onChange={newStarport => {
						setSelectedStarport(newStarport ?? null)
					}}
				/>
				{selectedStarport ? (
					<input
						type="hidden"
						name="starportId"
						value={selectedStarport.id ?? ''}
					/>
				) : null}
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

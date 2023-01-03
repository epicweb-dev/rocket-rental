import type { DataFunctionArgs } from '@remix-run/node'
import { redirect } from '@remix-run/node'
import { json } from '@remix-run/node'
import { Form, Link, useCatch, useLoaderData } from '@remix-run/react'
import { useState } from 'react'
import invariant from 'tiny-invariant'
import { requireUserId } from '~/utils/auth.server'
import { prisma } from '~/utils/db.server'
import { BrandCombobox } from '~/routes/resources+/brand-combobox'
import { ModelCombobox } from '~/routes/resources+/model-combobox'
import { StarportCombobox } from '~/routes/resources+/starport-combobox'

export async function loader({ request }: DataFunctionArgs) {
	const userId = await requireUserId(request)
	const host = await prisma.host.findFirst({
		where: { userId },
		select: { userId: true },
	})
	if (!host) {
		throw new Response('unauthorized', { status: 403 })
	}
	return json({})
}

export async function action({ request }: DataFunctionArgs) {
	const userId = await requireUserId(request)
	const host = await prisma.host.findFirst({
		where: { userId },
		select: { userId: true },
	})
	if (!host) {
		throw new Response('unauthorized', { status: 403 })
	}

	const formData = await request.formData()
	const {
		name,
		description,
		imageUrl,
		capacity,
		dailyCharge,
		modelId,
		starportId,
	} = Object.fromEntries(formData)

	invariant(typeof name === 'string', 'name type invalid')
	invariant(typeof description === 'string', 'description type invalid')
	invariant(typeof imageUrl === 'string', 'imageUrl type invalid')
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

	const ship = await prisma.ship.create({
		data: {
			hostId: host.userId,
			name,
			description,
			imageUrl,
			capacity: Number(capacity),
			dailyCharge: Number(dailyCharge),
			modelId: modelId,
			starportId: starportId,
		},
	})

	return redirect(`/ships/${ship.id}`)
}

export default function NewShipRoute() {
	const data = useLoaderData<typeof loader>()
	const [selectedStarport, setSelectedStarport] = useState<{
		id: string
		displayName: string
	} | null>(null)
	const [selectedModel, setSelectedModel] = useState<{
		id: string
		name: string
		imageUrl: string
	} | null>(null)
	const [selectedBrand, setSelectedBrand] = useState<{
		id: string
		name: string
		imageUrl: string
	} | null>(null)

	return (
		<div>
			<h1>Create A New Ship</h1>
			<Form method="post">
				<label>
					Name
					<input
						className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
						type="text"
						name="name"
					/>
				</label>
				<label>
					Description
					<input
						className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
						type="text"
						name="description"
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
				<input type="hidden" name="modelId" value={selectedModel?.id ?? ''} />
				<label>
					Image URL
					<input
						className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
						type="text"
						name="imageUrl"
					/>
				</label>
				<label>
					Capacity
					<input
						className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
						type="number"
						name="capacity"
						min="1"
						max="10"
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
					/>
				</label>
				<StarportCombobox
					selectedItem={selectedStarport}
					geolocation={null}
					onChange={newStarport => {
						setSelectedStarport(newStarport ?? null)
					}}
				/>
				<input
					type="hidden"
					name="starportId"
					value={selectedStarport?.id ?? ''}
				/>
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

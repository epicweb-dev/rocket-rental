import type { DataFunctionArgs } from '@remix-run/node'
import { json } from '@remix-run/node'
import { Outlet, useCatch, useLoaderData, useParams } from '@remix-run/react'
import invariant from 'tiny-invariant'
import { prisma } from '~/utils/db.server'

export async function loader({ params }: DataFunctionArgs) {
	invariant(params.modelId, 'Missing modelId')
	const shipModel = await prisma.shipModel.findFirst({
		where: { id: params.modelId },
	})

	if (!shipModel) {
		throw new Response('not found', { status: 404 })
	}
	return json({ shipModel })
}

export default function ModelRoute() {
	const data = useLoaderData<typeof loader>()
	return (
		<div>
			<h1>Ship Model</h1>
			<pre>{JSON.stringify(data, null, 2)}</pre>
			<hr />
			<Outlet />
		</div>
	)
}

export function CatchBoundary() {
	const caught = useCatch()
	const params = useParams()

	if (caught.status === 404) {
		return <div>Model "{params.modelId}" not found</div>
	}

	throw new Error(`Unexpected caught response with status: ${caught.status}`)
}

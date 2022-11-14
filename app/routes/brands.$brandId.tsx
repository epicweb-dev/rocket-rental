import type { DataFunctionArgs } from '@remix-run/node'
import { json } from '@remix-run/node'
import { Outlet, useCatch, useLoaderData, useParams } from '@remix-run/react'
import invariant from 'tiny-invariant'
import { prisma } from '~/db.server'

export async function loader({ params }: DataFunctionArgs) {
	invariant(params.brandId, 'Missing brandId')
	const shipBrand = await prisma.shipBrand.findFirst({
		where: { id: params.brandId },
	})

	if (!shipBrand) {
		throw new Response('not found', { status: 404 })
	}
	return json({ shipBrand })
}

export default function BrandRoute() {
	const data = useLoaderData<typeof loader>()
	return (
		<div>
			<h1>Ship Brand</h1>
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
		return <div>Booking "{params.starportId}" not found</div>
	}

	throw new Error(`Unexpected caught response with status: ${caught.status}`)
}

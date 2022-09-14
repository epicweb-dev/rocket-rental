import type { LoaderArgs } from '@remix-run/node'
import { json } from '@remix-run/node'
import { useCatch, useLoaderData, useParams } from '@remix-run/react'
import invariant from 'tiny-invariant'
import { prisma } from '~/db.server'
import { authenticator } from '~/services/auth.server'

export async function loader({ request, params }: LoaderArgs) {
	invariant(params.shipId, 'Missing shipId')
	const userId = await authenticator.isAuthenticated(request, {
		failureRedirect: `/ships/${params.shipId}`,
	})
	const ship = await prisma.ship.findFirst({
		where: { id: params.shipId, hostId: userId },
	})
	if (!ship) {
		throw new Response('not found', { status: 404 })
	}
	return json({})
}

export default function ShipEditRoute() {
	const data = useLoaderData<typeof loader>()
	return (
		<div>
			<h1>Ship Edit</h1>
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

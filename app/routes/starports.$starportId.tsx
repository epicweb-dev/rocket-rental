import type { LoaderArgs } from '@remix-run/node'
import { json } from '@remix-run/node'
import { useCatch, useLoaderData, useParams } from '@remix-run/react'
import invariant from 'tiny-invariant'
import { prisma } from '~/db.server'

export async function loader({ params }: LoaderArgs) {
	invariant(params.starportId, 'Missing starportId')
	const starport = await prisma.starport.findUnique({
		where: { id: params.starportId },
	})
	if (!starport) {
		throw new Response('not found', { status: 404 })
	}
	return json({ starport })
}

export default function StarportRoute() {
	const data = useLoaderData<typeof loader>()
	return (
		<div>
			<h1>Starport</h1>
			<pre>{JSON.stringify(data, null, 2)}</pre>
		</div>
	)
}

export function CatchBoundary() {
	const caught = useCatch()
	const params = useParams()

	if (caught.status === 404) {
		return <div>Starport "{params.starportId}" not found</div>
	}

	throw new Error(`Unexpected caught response with status: ${caught.status}`)
}

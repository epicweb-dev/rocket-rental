import type { LoaderArgs } from '@remix-run/node'
import { redirect } from '@remix-run/node'
import { json } from '@remix-run/node'
import { useCatch, useLoaderData, useParams } from '@remix-run/react'
import invariant from 'tiny-invariant'
import { prisma } from '~/db.server'

export async function loader({ params }: LoaderArgs) {
	invariant(params.username, 'Missing username')
	const user = await prisma.user.findUnique({
		where: { username: params.username },
		select: {
			username: true,
			host: {
				select: {
					bio: true,
					createdAt: true,
					reviews: {
						select: {
							createdAt: true,
							id: true,
							description: true,
							host: {
								select: {
									user: {
										select: {
											imageUrl: true,
											name: true,
											username: true,
										},
									},
								},
							},
						},
					},
					renterReviews: {
						select: {
							createdAt: true,
							id: true,
							description: true,
							renter: {
								select: {
									user: {
										select: {
											imageUrl: true,
											name: true,
											username: true,
										},
									},
								},
							},
						},
					},
				},
			},
		},
	})
	if (!user) {
		throw new Response('not found', { status: 404 })
	}
	return json({ user })
}

export default function HostUserRoute() {
	const data = useLoaderData<typeof loader>()
	if (!data.user.host) {
		return <div>This user is not a host... yet...</div>
	}

	return (
		<div>
			<h2>Host</h2>
			<pre>{JSON.stringify(data, null, 2)}</pre>
		</div>
	)
}

export function CatchBoundary() {
	const caught = useCatch()
	const params = useParams()

	if (caught.status === 404) {
		return <div>User "{params.username}" not found</div>
	}

	throw new Error(`Unexpected caught response with status: ${caught.status}`)
}

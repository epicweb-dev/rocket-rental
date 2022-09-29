import type { LoaderArgs } from '@remix-run/node'
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
			renter: {
				select: {
					userId: true,
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
					hostReviews: {
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
					shipReviews: {
						select: {
							createdAt: true,
							id: true,
							description: true,
							ship: {
								select: {
									id: true,
									name: true,
									imageUrl: true,
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

export default function RenterUserRoute() {
	const data = useLoaderData<typeof loader>()
	if (!data.user.renter) {
		return <div>This user is not a renter... yet...</div>
	}

	return (
		<div>
			<h2>Renter</h2>
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

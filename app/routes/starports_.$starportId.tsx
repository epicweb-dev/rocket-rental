import type { DataFunctionArgs } from '@remix-run/node'
import { json } from '@remix-run/node'
import { useCatch, useLoaderData, useParams } from '@remix-run/react'
import invariant from 'tiny-invariant'
import { prisma } from '~/db.server'

export async function loader({ params }: DataFunctionArgs) {
	invariant(params.starportId, 'Missing starportId')
	const starport = await prisma.starport.findUnique({
		where: { id: params.starportId },
		select: {
			imageUrl: true,
			name: true,
			description: true,
			latitude: true,
			longitude: true,
			ships: {
				select: {
					id: true,
					name: true,
					imageUrl: true,
					host: {
						select: {
							user: {
								select: {
									name: true,
									imageUrl: true,
								},
							},
						},
					},
					// TODO: figure out a way to do this as an optimized aggregation
					// so we don't have to do this outside the database.
					reviews: {
						select: {
							rating: true,
						},
					},
				},
			},
		},
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
			<img src={data.starport.imageUrl} alt="" />
			<h1>
				{data.starport.name} ({data.starport.latitude},{' '}
				{data.starport.longitude})
			</h1>
			<div>{data.starport.description}</div>
			<h2>Ships</h2>
			<ul>
				{data.starport.ships.map(ship => (
					<li key={ship.id} className="p-6">
						<a href={`/ships/${ship.id}`} className="flex gap-4 bg-slate-400">
							<img
								src={ship.imageUrl}
								alt=""
								className="h-24 w-24 object-cover"
							/>
							<div className="flex flex-col gap-2">
								<div className="text-xl">{ship.name}</div>
								<div className="flex gap-2">
									{ship.host.user.imageUrl ? (
										<img
											src={ship.host.user.imageUrl}
											alt=""
											className="h-8 w-8 rounded-full"
										/>
									) : null}
									<div className="flex flex-col gap-1">
										<div className="text-sm font-semibold">
											{ship.host.user.name}
										</div>
										<div className="text-sm text-gray-500">
											{ship.reviews.length > 0
												? `${arrAvg(
														ship.reviews.map(r => r.rating),
												  )} of 5 stars (${ship.reviews.length} reviews)`
												: 'no reviews yet'}
										</div>
									</div>
								</div>
							</div>
						</a>
					</li>
				))}
			</ul>
		</div>
	)
}

const arrAvg = (arr: Array<number>) =>
	arr.reduce((a, b) => a + b, 0) / arr.length

export function CatchBoundary() {
	const caught = useCatch()
	const params = useParams()

	if (caught.status === 404) {
		return <div>Starport "{params.starportId}" not found</div>
	}

	throw new Error(`Unexpected caught response with status: ${caught.status}`)
}

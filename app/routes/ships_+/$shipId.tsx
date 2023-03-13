import { json, type DataFunctionArgs } from '@remix-run/node'
import { Link, Outlet, useLoaderData } from '@remix-run/react'
import invariant from 'tiny-invariant'
import { GeneralErrorBoundary } from '~/components/error-boundary'
import { prisma } from '~/utils/db.server'
import { getImgSrc, getShipImgSrc, getUserImgSrc } from '~/utils/misc'

export async function loader({ params }: DataFunctionArgs) {
	invariant(params.shipId, 'Missing shipId')
	const ship = await prisma.ship.findUnique({
		where: { id: params.shipId },
		select: {
			id: true,
			name: true,
			description: true,
			imageId: true,
			host: {
				select: {
					createdAt: true,
					user: {
						select: {
							username: true,
							name: true,
							imageId: true,
						},
					},
				},
			},
			model: {
				select: {
					id: true,
					name: true,
					description: true,
					imageId: true,
					brand: {
						select: {
							id: true,
							name: true,
							description: true,
							imageId: true,
						},
					},
				},
			},
			capacity: true,
			dailyCharge: true,
			starport: {
				select: {
					id: true,
					imageId: true,
					name: true,
					latitude: true,
					longitude: true,
				},
			},
			reviews: {
				select: {
					id: true,
					rating: true,
					content: true,
					createdAt: true,
					reviewer: {
						select: {
							user: {
								select: {
									username: true,
									name: true,
									imageId: true,
								},
							},
						},
					},
				},
			},
		},
	})

	if (!ship) {
		throw new Response('not found', { status: 404 })
	}

	return json({ ship })
}

export default function ShipRoute() {
	const data = useLoaderData<typeof loader>()
	return (
		<div>
			<img src={getShipImgSrc(data.ship.imageId)} alt="" />
			<h1 className="text-h1">{data.ship.name}</h1>
			<p>{data.ship.description}</p>

			<div className="flex flex-wrap gap-12">
				<div>
					<p>
						<Link to={`/users/${data.ship.host.user.username}`}>
							{data.ship.host.user.imageId ? (
								<img
									src={getUserImgSrc(data.ship.host.user.imageId)}
									alt={data.ship.host.user.name ?? "Ship's host"}
									title={data.ship.host.user.name ?? "Ship's host"}
									className="aspect-square w-12"
								/>
							) : (
								`Host: ${data.ship.host.user.name}`
							)}
						</Link>
					</p>
					<p>
						<Link to={`/models/${data.ship.model.id}`}>
							{data.ship.model.imageId ? (
								<img
									src={getImgSrc(data.ship.model.imageId)}
									alt={data.ship.model.name ?? "Ship's model"}
									title={data.ship.model.name ?? "Ship's model"}
									className="aspect-square w-12"
								/>
							) : (
								`Model: ${data.ship.model.name}`
							)}
						</Link>
					</p>
					<p>Capacity: {data.ship.capacity}</p>
					<p>Daily Charge: {data.ship.dailyCharge}</p>
					<p>Starport: {data.ship.starport.name}</p>
				</div>
				<div>
					<div>
						<Outlet />
					</div>
					<div>
						<p>
							<strong>Reviews:</strong>
						</p>
						<ul>
							{data.ship.reviews.map(review => (
								<li key={review.id}>
									<p>
										<Link to={`/users/${review.reviewer.user.username}`}>
											{review.reviewer.user.imageId ? (
												<img
													src={getUserImgSrc(review.reviewer.user.imageId)}
													alt={review.reviewer.user.name ?? "Ship's host"}
													title={review.reviewer.user.name ?? "Ship's host"}
													className="aspect-square w-12"
												/>
											) : (
												`Reviewer Name: ${review.reviewer.user.name}`
											)}
										</Link>
									</p>
									<p>Rating: {review.rating}</p>
									<p>{review.content}</p>
								</li>
							))}
						</ul>
					</div>
				</div>
			</div>
			<pre>{JSON.stringify(data, null, 2)}</pre>
		</div>
	)
}
export function ErrorBoundary() {
	return (
		<GeneralErrorBoundary
			statusHandlers={{
				404: () => <p>Ship not found</p>,
			}}
		/>
	)
}

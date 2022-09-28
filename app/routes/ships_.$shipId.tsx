import type { LoaderArgs } from '@remix-run/node'
import { json } from '@remix-run/node'
import { Link, useCatch, useLoaderData, useParams } from '@remix-run/react'
import invariant from 'tiny-invariant'
import { prisma } from '~/db.server'

export async function loader({ params }: LoaderArgs) {
	invariant(params.shipId, 'Missing shipId')
	const ship = await prisma.ship.findUnique({
		where: { id: params.shipId },
		select: {
			name: true,
			description: true,
			imageUrl: true,
			host: {
				select: {
					createdAt: true,
					user: {
						select: {
							username: true,
							name: true,
							imageUrl: true,
						},
					},
				},
			},
			brand: {
				select: {
					id: true,
					name: true,
					imageUrl: true,
				},
			},
			capacity: true,
			dailyCharge: true,
			starport: {
				select: {
					id: true,
					imageUrl: true,
					name: true,
					latitude: true,
					longitude: true,
				},
			},
			reviews: {
				select: {
					id: true,
					rating: true,
					description: true,
					createdAt: true,
					renter: {
						select: {
							user: {
								select: {
									username: true,
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

	if (!ship) {
		throw new Response('not found', { status: 404 })
	}
	return json({ ship })
}

export default function ShipRoute() {
	const data = useLoaderData<typeof loader>()
	return (
		<div>
			<img src={data.ship.imageUrl} alt="" />
			<h1>{data.ship.name}</h1>
			<p>{data.ship.description}</p>

			<div className="flex flex-wrap gap-12">
				<div>
					<p>
						<Link to={`/users/${data.ship.host.user.username}`}>
							{data.ship.host.user.imageUrl ? (
								<img
									src={data.ship.host.user.imageUrl}
									alt={data.ship.host.user.name ?? "Ship's host"}
									title={data.ship.host.user.name ?? "Ship's host"}
									className="aspect-square w-12"
								/>
							) : (
								`Brand: ${data.ship.host.user.name}`
							)}
						</Link>
					</p>
					<p>
						<Link to={`/brands/${data.ship.brand.id}`}>
							{data.ship.brand.imageUrl ? (
								<img
									src={data.ship.brand.imageUrl}
									alt={data.ship.brand.name ?? "Ship's brand"}
									title={data.ship.brand.name ?? "Ship's brand"}
									className="aspect-square w-12"
								/>
							) : (
								`Brand: ${data.ship.brand.name}`
							)}
						</Link>
					</p>
					<p>Capacity: {data.ship.capacity}</p>
					<p>Daily Charge: {data.ship.dailyCharge}</p>
					<p>Starport: {data.ship.starport.name}</p>
				</div>
				<div>
					<div>
						<p>Book this rocket</p>
					</div>
					<div>
						<p>
							<strong>Reviews:</strong>
						</p>
						<ul>
							{data.ship.reviews.map(review => (
								<li key={review.id}>
									<p>
										<Link to={`/users/${review.renter.user.username}`}>
											{review.renter.user.imageUrl ? (
												<img
													src={review.renter.user.imageUrl}
													alt={review.renter.user.name ?? "Ship's host"}
													title={review.renter.user.name ?? "Ship's host"}
													className="aspect-square w-12"
												/>
											) : (
												`Brand: ${review.renter.user.name}`
											)}
										</Link>
									</p>
									<p>Rating: {review.rating}</p>
									<p>{review.description}</p>
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

export function CatchBoundary() {
	const caught = useCatch()
	const params = useParams()

	if (caught.status === 404) {
		return <div>Ship "{params.shipId}" not found</div>
	}

	throw new Error(`Unexpected caught response with status: ${caught.status}`)
}

import type { DataFunctionArgs } from '@remix-run/node'
import { json } from '@remix-run/node'
import {
	Link,
	Outlet,
	useCatch,
	useLoaderData,
	useParams,
} from '@remix-run/react'
import invariant from 'tiny-invariant'
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
					description: true,
					createdAt: true,
					renter: {
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
			<h1>{data.ship.name}</h1>
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
								`Brand: ${data.ship.host.user.name}`
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
					<p>SHOW MAP HERE</p>
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
										<Link to={`/users/${review.renter.user.username}`}>
											{review.renter.user.imageId ? (
												<img
													src={getUserImgSrc(review.renter.user.imageId)}
													alt={review.renter.user.name ?? "Ship's host"}
													title={review.renter.user.name ?? "Ship's host"}
													className="aspect-square w-12"
												/>
											) : (
												`Renter Name: ${review.renter.user.name}`
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

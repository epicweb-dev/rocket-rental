import type { LoaderArgs } from '@remix-run/node'
import { json } from '@remix-run/node'
import { Outlet, useCatch, useLoaderData, useParams } from '@remix-run/react'
import invariant from 'tiny-invariant'
import { prisma } from '~/db.server'
import { requireUserId } from '~/utils/auth.server'

export async function loader({ request, params }: LoaderArgs) {
	invariant(params.bookingId, 'Missing bookingId')
	const userId = await requireUserId(request)
	const booking = await prisma.booking.findFirst({
		where: {
			AND: [
				{ id: params.bookingId },
				{
					OR: [{ renterId: userId }, { ship: { hostId: userId } }],
				},
			],
		},
		select: {
			id: true,
			shipId: true,
			totalPrice: true,
			startDate: true,
			endDate: true,
			shipReview: true,
			renterReview: true,
			hostReview: true,
			renterId: true,
			ship: {
				select: {
					hostId: true,
				},
			},
		},
	})

	if (!booking) {
		throw new Response('not found', { status: 404 })
	}

	const bookingIsPast = booking.endDate.getTime() < Date.now()
	const reviewTimeExpired =
		booking.endDate.getTime() + 1000 * 60 * 60 * 24 * 14 < Date.now()
	const allReviewsSubmitted =
		booking.shipReview && booking.renterReview && booking.hostReview
	const isHost = booking.ship.hostId === userId
	const isRenter = booking.renterId === userId

	return json({
		booking: {
			...booking,
			shipReview:
				isRenter || allReviewsSubmitted || reviewTimeExpired
					? booking.shipReview
					: null,
			renterReview:
				isRenter || allReviewsSubmitted || reviewTimeExpired
					? booking.renterReview
					: null,
			hostReview:
				isHost || allReviewsSubmitted || reviewTimeExpired
					? booking.hostReview
					: null,
		},
		canReview: bookingIsPast && !allReviewsSubmitted && !reviewTimeExpired,
	})
}

export default function BookingRoute() {
	const data = useLoaderData<typeof loader>()
	return (
		<div>
			<h2>Booking</h2>
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

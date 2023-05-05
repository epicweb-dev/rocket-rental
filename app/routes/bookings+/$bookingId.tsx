import { json, type DataFunctionArgs } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import invariant from 'tiny-invariant'
import { GeneralErrorBoundary } from '~/components/error-boundary.tsx'
import {
	calculateCanReview,
	calculateReviewTimeExperied,
	ReviewCard,
	Reviewer,
	ReviewFormSchema,
} from '~/routes/resources+/reviewer.tsx'
import { requireUserId } from '~/utils/auth.server.ts'
import { prisma } from '~/utils/db.server.ts'
import { getFieldsFromSchema } from '~/utils/forms.tsx'
import { useUser } from '~/utils/misc.ts'

export async function loader({ request, params }: DataFunctionArgs) {
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
			renter: {
				select: { user: { select: { id: true, name: true, imageId: true } } },
			},
			ship: {
				select: {
					name: true,
					imageId: true,
					host: {
						select: {
							user: { select: { id: true, name: true, imageId: true } },
						},
					},
				},
			},
			shipId: true,
			totalPrice: true,
			startDate: true,
			endDate: true,
			shipReview: true,
			renterReview: true,
			hostReview: true,
		},
	})

	if (!booking) {
		throw new Response('not found', { status: 404 })
	}

	const reviewTimeExpired = calculateReviewTimeExperied(booking.endDate)
	const allReviewsSubmitted =
		booking.shipReview && booking.renterReview && booking.hostReview
	const isHost = booking.ship.host.user.id === userId
	const isRenter = booking.renter.user.id === userId

	return json({
		booking: {
			...booking,
			shipReview:
				isRenter || allReviewsSubmitted || reviewTimeExpired
					? booking.shipReview
					: null,
			renterReview:
				isHost || allReviewsSubmitted || reviewTimeExpired
					? booking.renterReview
					: null,
			hostReview:
				isRenter || allReviewsSubmitted || reviewTimeExpired
					? booking.hostReview
					: null,
		},
		canReview: calculateCanReview(booking),
		reviewerFieldMetadatas: getFieldsFromSchema(ReviewFormSchema),
	})
}

export default function BookingRoute() {
	const data = useLoaderData<typeof loader>()
	const user = useUser()
	const isRenter = data.booking.renter.user.id === user.id
	const isHost = data.booking.ship.host.user.id === user.id
	return (
		<div>
			<h2>Booking</h2>
			<details>
				<summary>Booking Data</summary>
				<pre>{JSON.stringify(data, null, 2)}</pre>
			</details>
			{isRenter ? (
				<div>
					{data.canReview ? (
						<>
							<Reviewer
								type="ship"
								bookingId={data.booking.id}
								reviewee={data.booking.ship}
								existingReview={data.booking.shipReview}
								fieldMetadatas={data.reviewerFieldMetadatas}
							/>
							<Reviewer
								type="host"
								bookingId={data.booking.id}
								reviewee={data.booking.ship.host.user}
								existingReview={data.booking.hostReview}
								fieldMetadatas={data.reviewerFieldMetadatas}
							/>
						</>
					) : null}
				</div>
			) : null}
			{isHost ? (
				<div>
					{data.canReview ? (
						<Reviewer
							type="renter"
							bookingId={data.booking.id}
							reviewee={data.booking.renter.user}
							existingReview={data.booking.renterReview}
							fieldMetadatas={data.reviewerFieldMetadatas}
						/>
					) : null}
				</div>
			) : null}
			{data.canReview ? null : (
				<div>
					<h3>Booking Reviews</h3>
					{data.booking.hostReview ? (
						<ReviewCard
							type="host"
							reviewer={data.booking.renter.user}
							review={data.booking.hostReview}
						/>
					) : (
						<div>No host review found</div>
					)}
					{data.booking.shipReview ? (
						<ReviewCard
							type="ship"
							reviewer={data.booking.renter.user}
							review={data.booking.shipReview}
						/>
					) : (
						<div>No ship review found</div>
					)}
					{data.booking.renterReview ? (
						<ReviewCard
							type="renter"
							reviewer={data.booking.ship.host.user}
							review={data.booking.renterReview}
						/>
					) : (
						<div>No renter review found</div>
					)}
				</div>
			)}
		</div>
	)
}

export function ErrorBoundary() {
	return (
		<GeneralErrorBoundary
			statusHandlers={{
				404: () => <p>Booking not found</p>,
			}}
		/>
	)
}

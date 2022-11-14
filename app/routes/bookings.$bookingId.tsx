import type { DataFunctionArgs } from '@remix-run/node'
import { json } from '@remix-run/node'
import {
	useCatch,
	useFetcher,
	useLoaderData,
	useParams,
} from '@remix-run/react'
import invariant from 'tiny-invariant'
import { prisma } from '~/db.server'
import { requireUserId } from '~/utils/auth.server'
import { getErrorInfo, useUser } from '~/utils/misc'

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
				select: { user: { select: { id: true, name: true } } },
			},
			ship: {
				select: {
					name: true,
					host: {
						select: { user: { select: { id: true, name: true } } },
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
	})
}

function calculateReviewTimeExperied(bookingEndDate: Date) {
	return bookingEndDate.getTime() + 1000 * 60 * 60 * 24 * 14 < Date.now()
}

function calculateCanReview(booking: {
	endDate: Date
	shipReview: {} | null
	renterReview: {} | null
	hostReview: {} | null
}) {
	const bookingIsPast = booking.endDate.getTime() < Date.now()
	const reviewTimeExpired = calculateReviewTimeExperied(booking.endDate)
	const allReviewsSubmitted =
		booking.shipReview && booking.renterReview && booking.hostReview
	return bookingIsPast && !allReviewsSubmitted && !reviewTimeExpired
}

const MIN_DESCRIPTION_LENGTH = 10

async function validatePermission({
	intent,
	submitterUserId,
	renterId,
	hostId,
}: {
	intent: string
	submitterUserId: string
	renterId: string
	hostId: string
}) {
	if (intent.includes('renter')) {
		if (hostId !== submitterUserId) {
			return 'Only the host can submit a review for the renter'
		}
	} else if (intent.includes('ship')) {
		if (renterId !== submitterUserId) {
			return 'Only the renter can submit a review for the ship'
		}
	} else if (intent.includes('host')) {
		if (renterId !== submitterUserId) {
			return 'Only the renter can submit a review for the host'
		}
	} else {
		return `Invalid intent: ${intent}`
	}
	return null
}

export async function action({ request, params }: DataFunctionArgs) {
	const bookingId = params.bookingId
	invariant(bookingId, 'Missing bookingId')
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
			renterId: true,
			endDate: true,
			ship: {
				select: { id: true, hostId: true },
			},
			shipReview: { select: { id: true } },
			renterReview: { select: { id: true } },
			hostReview: { select: { id: true } },
		},
	})
	if (!booking) {
		throw new Response('not found', { status: 404 })
	}
	const formData = await request.formData()
	const {
		intent,
		rating: ratingString = '0',
		description,
	} = Object.fromEntries(formData)
	invariant(typeof intent === 'string', 'Invalid intent')
	invariant(typeof ratingString === 'string', 'Invalid rating type')
	invariant(typeof description === 'string', 'Invalid description type')

	const rating = Number(ratingString)

	const errors = {
		form:
			(await validatePermission({
				renterId: booking.renterId,
				hostId: booking.ship.hostId,
				intent,
				submitterUserId: userId,
			})) ||
			(rating <= 5 && rating >= 1
				? null
				: 'Rating must be between 1 and 5 stars') ||
			(calculateCanReview(booking) ? null : 'Review time expired'),
		description:
			description.length > MIN_DESCRIPTION_LENGTH ? null : 'Review too short',
	}

	const hasErrors = Object.values(errors).some(Boolean)
	if (hasErrors) {
		return json({ errors }, { status: 400 })
	}

	switch (intent) {
		// review of the renter by the host
		case 'create-renter-review': {
			await prisma.renterReview.create({
				data: {
					hostId: booking.ship.hostId,
					renterId: booking.renterId,
					rating,
					description,
					bookingId,
				},
			})
			break
		}
		case 'update-renter-review': {
			await prisma.renterReview.update({
				where: { bookingId },
				data: {
					rating,
					description,
				},
			})
			break
		}
		// review of the ship by the renter
		case 'create-ship-review': {
			await prisma.shipReview.create({
				data: {
					shipId: booking.ship.id,
					bookingId,
					rating,
					description,
					renterId: userId,
				},
			})
			break
		}
		case 'update-ship-review': {
			await prisma.shipReview.update({
				where: { bookingId },
				data: {
					rating,
					description,
					renterId: userId,
				},
			})
			break
		}
		// review of the host by the renter
		case 'create-host-review': {
			console.log({
				hostId: booking.ship.hostId,
				bookingId,
				rating,
				description,
				renterId: userId,
			})
			await prisma.hostReview.create({
				data: {
					hostId: booking.ship.hostId,
					bookingId,
					rating,
					description,
					renterId: userId,
				},
			})
			break
		}
		case 'update-host-review': {
			await prisma.hostReview.update({
				where: { bookingId },
				data: {
					rating,
					description,
					renterId: userId,
				},
			})
			break
		}
		default: {
			throw new Response(`Unsupported intent: ${intent}`, { status: 400 })
		}
	}
	return json({ success: true, errors: null })
}

export default function BookingRoute() {
	const data = useLoaderData<typeof loader>()
	const renterReviewFetcher = useFetcher<typeof action>()
	const hostReviewFetcher = useFetcher<typeof action>()
	const shipReviewFetcher = useFetcher<typeof action>()
	const shipErrorInfo = getErrorInfo({
		idPrefix: 'ship',
		errors: shipReviewFetcher.data?.errors,
		names: ['description', 'form'],
		ui: <span className="pt-1 text-red-700" />,
	})
	const hostErrorInfo = getErrorInfo({
		idPrefix: 'host',
		errors: hostReviewFetcher.data?.errors,
		names: ['description', 'form'],
		ui: <span className="pt-1 text-red-700" />,
	})
	const renterErrorInfo = getErrorInfo({
		idPrefix: 'renter',
		errors: renterReviewFetcher.data?.errors,
		names: ['description', 'form'],
		ui: <span className="pt-1 text-red-700" />,
	})
	const user = useUser()
	const isRenter = data.booking.renter.user.id === user.id
	const isHost = data.booking.ship.host.user.id === user.id
	return (
		<div>
			<h2>Booking</h2>
			<pre>{JSON.stringify(data, null, 2)}</pre>
			{isRenter ? (
				<div>
					{data.canReview ? (
						<>
							<div>
								<h3>Review {data.booking.ship.name} 🚀</h3>
								<shipReviewFetcher.Form
									method="post"
									noValidate
									{...shipErrorInfo.form.fieldProps}
								>
									<label>
										Rating:
										<div>
											{Array.from({ length: 5 }, (_, i) => (
												<input
													key={i}
													type="radio"
													name="rating"
													value={i + 1}
													defaultChecked={
														data.booking.shipReview
															? i + 1 === data.booking.shipReview.rating
															: i + 1 === 3
													}
												/>
											))}
										</div>
									</label>
									<div>
										<label htmlFor="ship-review-description">
											Ship Review:
										</label>
										<textarea
											id="ship-review-description"
											name="description"
											className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
											defaultValue={data.booking.shipReview?.description ?? ''}
											minLength={MIN_DESCRIPTION_LENGTH}
											{...shipErrorInfo.description.fieldProps}
										></textarea>
										{shipErrorInfo.description.errorUI}
									</div>
									<button
										type="submit"
										name="intent"
										value={
											data.booking.shipReview
												? 'update-ship-review'
												: 'create-ship-review'
										}
									>
										{data.booking.shipReview
											? 'Update Review'
											: 'Create Review'}
										{shipReviewFetcher.state === 'idle' ? '' : '...'}
									</button>
									<div>{shipErrorInfo.form.errorUI}</div>
								</shipReviewFetcher.Form>
							</div>
							<div>
								<h3>Review {data.booking.ship.host.user.name} 👤</h3>
								<hostReviewFetcher.Form
									method="post"
									noValidate
									{...hostErrorInfo.form.fieldProps}
								>
									<label>
										Rating:
										<div>
											{Array.from({ length: 5 }, (_, i) => (
												<input
													key={i}
													type="radio"
													name="rating"
													value={i + 1}
													defaultChecked={
														data.booking.hostReview
															? i + 1 === data.booking.hostReview.rating
															: i + 1 === 3
													}
												/>
											))}
										</div>
									</label>
									<div>
										<label htmlFor="host-review-description">
											Host Review:
										</label>
										<textarea
											id="host-review-description"
											name="description"
											className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
											defaultValue={data.booking.hostReview?.description ?? ''}
											minLength={MIN_DESCRIPTION_LENGTH}
											{...hostErrorInfo.description.fieldProps}
										></textarea>
										{hostErrorInfo.description.errorUI}
									</div>
									<button
										type="submit"
										name="intent"
										value={
											data.booking.hostReview
												? 'update-host-review'
												: 'create-host-review'
										}
									>
										{data.booking.hostReview
											? 'Update Review'
											: 'Create Review'}
										{hostReviewFetcher.state === 'idle' ? '' : '...'}
									</button>
									<div>{hostErrorInfo.form.errorUI}</div>
								</hostReviewFetcher.Form>
							</div>
						</>
					) : (
						<div>Show reviews here</div>
					)}
				</div>
			) : null}
			{isHost ? (
				<div>
					{data.canReview ? (
						<div>
							<h3>Review {data.booking.renter.user.name} 👤</h3>
							<renterReviewFetcher.Form
								method="post"
								noValidate
								{...renterErrorInfo.form.fieldProps}
							>
								<label>
									Rating:
									<div>
										{Array.from({ length: 5 }, (_, i) => (
											<input
												key={i}
												type="radio"
												name="rating"
												value={i + 1}
												defaultChecked={
													data.booking.renterReview
														? i + 1 === data.booking.renterReview.rating
														: i + 1 === 3
												}
											/>
										))}
									</div>
								</label>
								<div>
									<label htmlFor="renter-review-description">
										Renter Review:
									</label>
									<textarea
										id="renter-review-description"
										name="description"
										className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
										defaultValue={data.booking.renterReview?.description ?? ''}
										minLength={MIN_DESCRIPTION_LENGTH}
										{...renterErrorInfo.description.fieldProps}
									></textarea>
									{renterErrorInfo.description.errorUI}
								</div>
								<button
									type="submit"
									name="intent"
									value={
										data.booking.renterReview
											? 'update-renter-review'
											: 'create-renter-review'
									}
								>
									{data.booking.renterReview
										? 'Update Review'
										: 'Create Review'}
									{renterReviewFetcher.state === 'idle' ? '' : '...'}
								</button>
								<div>{renterErrorInfo.form.errorUI}</div>
							</renterReviewFetcher.Form>
						</div>
					) : (
						<div>Show reviews here</div>
					)}
				</div>
			) : null}
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

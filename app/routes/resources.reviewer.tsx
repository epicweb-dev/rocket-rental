import type { DataFunctionArgs } from '@remix-run/node'
import { json } from '@remix-run/node'
import { useFetcher } from '@remix-run/react'
import invariant from 'tiny-invariant'
import { prisma } from '~/db.server'
import { requireUserId } from '~/utils/auth.server'
import { getErrorInfo } from '~/utils/misc'

export function calculateReviewTimeExperied(bookingEndDate: Date) {
	return bookingEndDate.getTime() + 1000 * 60 * 60 * 24 * 14 < Date.now()
}

export function calculateCanReview(booking: {
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
	switch (intent) {
		case 'renter': {
			if (hostId !== submitterUserId) {
				return 'Only the host can submit a review for the renter'
			}
			break
		}
		case 'host': {
			if (renterId !== submitterUserId) {
				return 'Only the renter can submit a review for the host'
			}
			break
		}
		case 'ship': {
			if (renterId !== submitterUserId) {
				return 'Only the renter can submit a review for the ship'
			}
			break
		}
		default: {
			return `Invalid intent: ${intent}`
		}
	}
	return null
}

export async function action({ request }: DataFunctionArgs) {
	const formData = await request.formData()
	const {
		intent,
		rating: ratingString = '0',
		description,
		bookingId,
	} = Object.fromEntries(formData)
	invariant(typeof bookingId === 'string', 'Invalid bookingId type')

	const userId = await requireUserId(request)
	const booking = await prisma.booking.findFirst({
		where: {
			AND: [
				{ id: bookingId },
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
		case 'renter': {
			const data = {
				hostId: booking.ship.hostId,
				renterId: booking.renterId,
				rating,
				description,
				bookingId,
			}
			await prisma.renterReview.upsert({
				where: { bookingId },
				create: data,
				update: data,
			})
			break
		}
		// review of the ship by the renter
		case 'ship': {
			const data = {
				shipId: booking.ship.id,
				bookingId,
				rating,
				description,
				renterId: userId,
			}
			await prisma.shipReview.upsert({
				where: { bookingId },
				create: data,
				update: data,
			})
			break
		}
		// review of the host by the renter
		case 'host': {
			const data = {
				hostId: booking.ship.hostId,
				bookingId,
				rating,
				description,
				renterId: userId,
			}
			await prisma.hostReview.upsert({
				where: { bookingId },
				create: data,
				update: data,
			})
			break
		}
		default: {
			throw new Response(`Unsupported intent: ${intent}`, { status: 400 })
		}
	}
	return json({ success: true, errors: null })
}

const REVIEW_CARD_TITLES = {
	renter: 'Renter Review',
	ship: 'Ship Review',
	host: 'Host Review',
}

export function ReviewCard({
	type,
	review,
	reviewer,
}: {
	type: 'renter' | 'ship' | 'host'
	review: { rating: number; description: string }
	reviewer: { name: string | null; imageUrl: string | null }
}) {
	return (
		<section aria-labelledby={`${type}-review-title`}>
			<h4 id={`${type}-review-title`}>{REVIEW_CARD_TITLES[type]}</h4>
			<div title={`${review.rating} star review`}>
				{Array.from({ length: review.rating }, (_, i) => (
					<span key={i}>⭐</span>
				))}
			</div>
			<div className="flex gap-4">
				{reviewer.imageUrl ? (
					<img
						className="h-12 w-12 rounded-full"
						src={reviewer.imageUrl}
						alt={reviewer.name ?? ''}
					/>
				) : null}{' '}
				{review.description}
			</div>
		</section>
	)
}

const REVIEW_DESCRIPTION_LABELS = {
	renter: 'Renter Review',
	ship: 'Ship Review',
	host: 'Host Review',
}

const REVIEW_RATING_LABELS = {
	renter: 'Renter Rating',
	ship: 'Ship Rating',
	host: 'Host Rating',
}

const FORM_NAME = {
	renter: 'Renter Review',
	ship: 'Ship Review',
	host: 'Host Review',
}

export function Reviewer({
	type,
	reviewee,
	existingReview,
	bookingId,
}: {
	type: 'ship' | 'renter' | 'host'
	bookingId: string
	reviewee: {
		imageUrl?: string | null
		name?: string | null
	}
	existingReview?: { rating: number; description: string } | null
}) {
	const reviewFetcher = useFetcher<typeof action>()
	const errorInfo = getErrorInfo({
		idPrefix: type,
		errors: reviewFetcher.data?.errors,
		names: ['description', 'form'],
		ui: <span className="pt-1 text-red-700" />,
	})
	return (
		<div>
			<div className="flex gap-4">
				{reviewee.imageUrl ? (
					<img
						className="h-16 w-16 rounded-full"
						src={reviewee.imageUrl}
						alt={reviewee.name ?? type}
					/>
				) : null}
				<h3>Review {reviewee.name ?? type}</h3>
			</div>
			<reviewFetcher.Form
				method="post"
				action="/resources/reviewer"
				noValidate
				aria-label={FORM_NAME[type]}
				{...errorInfo.form.fieldProps}
			>
				<input type="hidden" name="bookingId" value={bookingId} />
				<fieldset role="radiogroup">
					<legend>{REVIEW_RATING_LABELS[type]}:</legend>
					{Array.from({ length: 5 }, (_, i) => {
						const number = i + 1
						const id = `${type}-rating-${number}`
						const checked = existingReview
							? i + 1 === existingReview.rating
							: i + 1 === 3
						return (
							<span key={i}>
								<label htmlFor={id} className="sr-only">
									{number} Stars
								</label>
								<input
									id={id}
									type="radio"
									name="rating"
									value={number}
									defaultChecked={checked}
								/>
							</span>
						)
					})}
				</fieldset>
				<div>
					<label htmlFor={`${type}-review-description`}>
						{REVIEW_DESCRIPTION_LABELS[type]}:
					</label>
					<textarea
						id={`${type}-review-description`}
						name="description"
						className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
						defaultValue={existingReview?.description ?? ''}
						minLength={MIN_DESCRIPTION_LENGTH}
						{...errorInfo.description.fieldProps}
					></textarea>
					{errorInfo.description.errorUI}
				</div>
				<button type="submit" name="intent" value={type}>
					{existingReview ? 'Update Review' : 'Create Review'}
					{reviewFetcher.state === 'idle' ? '' : '...'}
				</button>
				<div>{errorInfo.form.errorUI}</div>
			</reviewFetcher.Form>
		</div>
	)
}

import { json, type DataFunctionArgs } from '@remix-run/node'
import { useFetcher } from '@remix-run/react'
import { z } from 'zod'
import { requireUserId } from '~/utils/auth.server'
import { prisma } from '~/utils/db.server'
import { preprocessFormData, useForm, type FieldMetadatas } from '~/utils/forms'
import { getUserImgSrc } from '~/utils/misc'

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

const MIN_CONTENT_LENGTH = 10
const MAX_CONTENT_LENGTH = 10_000

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

export const ReviewFormSchema = z.object({
	intent: z.union([z.literal('renter'), z.literal('ship'), z.literal('host')], {
		invalid_type_error: 'Invalid intent',
	}),
	rating: z
		.number()
		.min(1, { message: 'Rating must be 1 or more' })
		.max(5, { message: 'Rating must be 5 or less' }),
	content: z
		.string()
		.min(MIN_CONTENT_LENGTH, {
			message: `Content must be at least ${MIN_CONTENT_LENGTH} characters`,
		})
		.max(MAX_CONTENT_LENGTH, {
			message: `Content must be at most ${MAX_CONTENT_LENGTH} characters`,
		}),
	bookingId: z.string({ invalid_type_error: 'Invalid bookingId' }),
})

export async function action({ request }: DataFunctionArgs) {
	const formData = await request.formData()
	const result = await ReviewFormSchema.safeParseAsync(
		preprocessFormData(formData, ReviewFormSchema),
	)
	if (!result.success) {
		return json({ errors: result.error.flatten() }, { status: 400 })
	}

	const { intent, rating, content, bookingId } = result.data
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

	const formErrors = [
		await validatePermission({
			renterId: booking.renterId,
			hostId: booking.ship.hostId,
			intent,
			submitterUserId: userId,
		}),
		calculateCanReview(booking) ? null : 'Review time expired',
	].filter(Boolean)

	if (formErrors.length) {
		return json({ errors: { fieldErrors: {}, formErrors } }, { status: 400 })
	}

	switch (intent) {
		// review of the renter by the host
		case 'renter': {
			const data = {
				reviewerId: booking.ship.hostId,
				subjectId: booking.renterId,
				rating,
				content,
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
				subjectId: booking.ship.id,
				bookingId,
				rating,
				content,
				reviewerId: userId,
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
				subjectId: booking.ship.hostId,
				bookingId,
				rating,
				content,
				reviewerId: userId,
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
	review: { rating: number; content: string }
	reviewer: { name: string | null; imageId: string | null }
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
				{reviewer.imageId ? (
					<img
						className="h-12 w-12 rounded-full"
						src={getUserImgSrc(reviewer.imageId)}
						alt={reviewer.name ?? ''}
					/>
				) : null}{' '}
				{review.content}
			</div>
		</section>
	)
}

const REVIEW_CONTENT_LABELS = {
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
	fieldMetadatas,
	existingReview,
	bookingId,
}: {
	type: 'ship' | 'renter' | 'host'
	bookingId: string
	fieldMetadatas: FieldMetadatas<keyof z.infer<typeof ReviewFormSchema>>
	reviewee: {
		imageId?: string | null
		name?: string | null
	}
	existingReview?: { rating: number; content: string } | null
}) {
	const reviewFetcher = useFetcher<typeof action>()
	const { form, fields } = useForm({
		name: `reviewer`,
		errors: reviewFetcher.data?.errors,
		fieldMetadatas,
	})

	return (
		<div>
			<div className="flex gap-4">
				{reviewee.imageId ? (
					<img
						className="h-16 w-16 rounded-full"
						src={getUserImgSrc(reviewee.imageId)}
						alt={reviewee.name ?? type}
					/>
				) : null}
				<h3>Review {reviewee.name ?? type}</h3>
			</div>
			<reviewFetcher.Form
				method="POST"
				action="/resources/reviewer"
				aria-label={FORM_NAME[type]}
				{...form.props}
			>
				<input {...fields.bookingId.props} type="hidden" value={bookingId} />
				<fieldset role="radiogroup">
					<legend
						onClick={event => {
							const legend = event?.currentTarget
							const checkedInput =
								legend.parentElement?.querySelector('input[checked]')
							if (checkedInput instanceof HTMLInputElement) {
								checkedInput.focus()
							}
						}}
					>
						{REVIEW_RATING_LABELS[type]}:
					</legend>
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
									value={number}
									defaultChecked={checked}
									{...fields.rating.props}
									id={id}
									type="radio"
								/>
							</span>
						)
					})}
				</fieldset>
				{fields.rating.errorUI}
				<div>
					<label {...fields.content.labelProps}>
						{REVIEW_CONTENT_LABELS[type]}:
					</label>
					<textarea
						className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
						defaultValue={existingReview?.content ?? ''}
						{...fields.content.props}
					/>
					{fields.content.errorUI}
				</div>
				<button type="submit" name="intent" value={type}>
					{existingReview ? 'Update Review' : 'Create Review'}
					{reviewFetcher.state === 'idle' ? '' : '...'}
				</button>
				<div>{form.errorUI}</div>
			</reviewFetcher.Form>
		</div>
	)
}

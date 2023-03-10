import { json, type DataFunctionArgs } from '@remix-run/node'
import { useCatch, useLoaderData, useParams } from '@remix-run/react'
import invariant from 'tiny-invariant'
import { getUserId, requireUserId } from '~/utils/auth.server'
import { prisma } from '~/utils/db.server'
import { useOptionalUser } from '~/utils/misc'
import { createChat, UserProfileBasicInfo } from './__shared'

export async function loader({ request, params }: DataFunctionArgs) {
	const loggedInUserId = await getUserId(request)
	invariant(params.username, 'Missing username')
	const user = await prisma.user.findUnique({
		where: { username: params.username },
		select: {
			id: true,
			username: true,
			name: true,
			imageId: true,
			renter: {
				select: {
					userId: true,
					bio: true,
					createdAt: true,
					reviews: {
						select: {
							id: true,
							content: true,
							rating: true,
							reviewer: {
								select: {
									user: {
										select: {
											imageId: true,
											name: true,
											username: true,
										},
									},
								},
							},
							booking: {
								select: {
									ship: {
										select: {
											id: true,
											name: true,
										},
									},
								},
							},
						},
					},
				},
			},
		},
	})
	if (!user?.renter) {
		throw new Response('not found', { status: 404 })
	}

	const totalBookings = await prisma.booking.count({
		where: {
			AND: [{ renterId: user.id }, { endDate: { lte: new Date() } }],
		},
	})
	const averageReviews = await prisma.renterReview.aggregate({
		where: { subjectId: user.id },
		_avg: { rating: true },
	})
	const oneOnOneChat = loggedInUserId
		? await prisma.chat.findFirst({
				where: {
					users: {
						every: {
							id: { in: [user.id, loggedInUserId] },
						},
					},
				},
				select: { id: true },
		  })
		: null

	return json({
		user,
		oneOnOneChat,
		userJoinedDisplay: user.renter.createdAt.toLocaleDateString(),
		totalBookings,
		rating: averageReviews._avg.rating,
	})
}

export async function action({ request, params }: DataFunctionArgs) {
	const formData = await request.formData()
	const loggedInUserId = await requireUserId(request)
	invariant(params.username, 'Missing username')
	const intent = formData.get('intent')
	if (intent === 'create-chat') {
		return createChat({ loggedInUserId, username: params.username })
	}
	throw new Error(`Unknown intent: ${intent}`)
}

export default function RenterUser() {
	const data = useLoaderData<typeof loader>()

	// it's unclear why this is necessary 🤷‍♂️
	invariant(data.user.renter, 'This should not be possible...')

	const loggedInUser = useOptionalUser()
	const isLoggedInUser = loggedInUser?.id === data.user.id

	return (
		<div className="mt-11">
			<UserProfileBasicInfo
				user={data.user}
				rating={data.rating}
				userJoinedDisplay={data.userJoinedDisplay}
				userLoggedIn={Boolean(loggedInUser)}
				isSelf={isLoggedInUser}
				oneOnOneChatId={data.oneOnOneChat?.id}
				stats={[
					{ label: 'trips', num: data.totalBookings },
					{ label: 'reviews', num: data.user.renter.reviews.length },
				]}
				bio={data.user.renter.bio}
			/>
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

export function ErrorBoundary({ error }: { error: Error }) {
	console.error(error)

	return <div>An unexpected error occurred: {error.message}</div>
}

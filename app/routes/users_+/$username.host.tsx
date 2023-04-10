import * as Separator from '@radix-ui/react-separator'
import {
	json,
	type DataFunctionArgs,
	type V2_MetaFunction,
} from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import invariant from 'tiny-invariant'
import { GeneralErrorBoundary } from '~/components/error-boundary'
import { StarRatingDisplay } from '~/components/star-rating-display'
import { getUserId, requireUserId } from '~/utils/auth.server'
import { prisma } from '~/utils/db.server'
import { ButtonLink } from '~/utils/forms'
import { getShipImgSrc, useOptionalUser } from '~/utils/misc'
import { createChat, Reviews, UserProfileBasicInfo } from './__shared'

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
			host: {
				select: {
					userId: true,
					bio: true,
					createdAt: true,
					ships: {
						select: {
							id: true,
							name: true,
							imageId: true,
							dailyCharge: true,
							reviews: { select: { rating: true } },
							model: {
								select: {
									id: true,
									name: true,
									brand: {
										select: {
											id: true,
											name: true,
										},
									},
								},
							},
						},
					},
					reviews: {
						select: {
							createdAt: true,
							id: true,
							content: true,
							rating: true,
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
						},
					},
				},
			},
		},
	})
	if (!user?.host) {
		throw new Response('not found', { status: 404 })
	}
	const totalBookings = await prisma.booking.count({
		where: {
			AND: [{ ship: { hostId: user.id } }, { endDate: { lte: new Date() } }],
		},
	})
	const totalShips = await prisma.ship.count({
		where: { hostId: user.id },
	})
	const averageReviews = await prisma.hostReview.aggregate({
		where: { subjectId: user.id },
		_avg: { rating: true },
	})
	const oneOnOneChat = loggedInUserId
		? await prisma.chat.findFirst({
				where: {
					AND: [
						// make sure the chat is not empty and has the user in it
						{
							users: {
								some: {
									id: { in: [user.id] },
								},
							},
						},
						// find the one that the logged in user is in
						{
							users: {
								every: {
									id: { in: [user.id, loggedInUserId] },
								},
							},
						},
					],
				},
				select: { id: true, users: { select: { id: true } } },
		  })
		: null

	return json({
		user: {
			...user,
			host: {
				...user.host,
				ships: user.host.ships.map(ship => ({
					...ship,
					averageRating:
						ship.reviews.reduce((acc, review) => acc + review.rating, 0) /
						(ship.reviews.length || 1),
					dailyChargeFormatted: ship.dailyCharge.toLocaleString('en-US', {
						style: 'currency',
						currency: 'USD',
					}),
				})),
			},
		},
		oneOnOneChat,
		userJoinedDisplay: user.host.createdAt.toLocaleDateString(),
		totalBookings,
		totalShips,
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

export default function HostUser() {
	const data = useLoaderData<typeof loader>()

	// it's unclear why this is necessary 🤷‍♂️
	invariant(data.user.host, 'This should not be possible...')

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
					{ label: 'rockets', num: data.totalShips },
					{ label: 'reviews', num: data.user.host.reviews.length },
				]}
				bio={data.user.host.bio}
			/>

			<div className="container mx-auto mt-20">
				<h2 className="text-h3">
					{data.user.host.ships.length
						? `${data.user.name ?? data.user.username}'s rockets`
						: 'No rockets yet'}
				</h2>
				<div className="mt-10 flex flex-wrap justify-center gap-6">
					{data.user.host.ships.length ? (
						data.user.host.ships.slice(0, 9).map(ship => (
							<div
								key={ship.name}
								className="flex max-w-sm flex-col rounded-3xl bg-night-500"
							>
								<Link to={`/ships/${ship.id}`}>
									<img
										className="aspect-[35/31] rounded-3xl"
										src={getShipImgSrc(ship.imageId)}
										alt={ship.name}
									/>
								</Link>
								<div className="h-10" />
								<div className="px-6 pb-8">
									<div className="flex flex-col gap-2">
										<div className="flex items-center gap-2">
											<Link
												to={`/search?${new URLSearchParams({
													brandId: ship.model.brand.id,
												})}`}
											>
												<p className="font-bold">{ship.model.brand.name}</p>
											</Link>
											<Separator.Root
												orientation="vertical"
												className="h-[16px] w-[1.5px] bg-night-400"
											/>
											<Link
												to={`/search?${new URLSearchParams({
													modelId: ship.model.id,
												})}`}
											>
												<p className="text-night-200">{ship.model.name}</p>
											</Link>
										</div>
										<Link to={`/ships/${ship.id}`}>
											<h3 className="text-h4">{ship.name}</h3>
										</Link>
									</div>
									<div className="mt-8 flex justify-between">
										<div className="flex items-baseline gap-1">
											<span className="text-h5">
												{ship.dailyChargeFormatted}
											</span>
											<span className="text-night-200">day</span>
										</div>
										{ship.reviews.length ? (
											<Link to={`/ships/${ship.id}/reviews`}>
												<StarRatingDisplay
													size="sm"
													rating={ship.averageRating}
												/>
											</Link>
										) : null}
									</div>
								</div>
							</div>
						))
					) : (
						<div className="text-center text-night-200">
							{`${
								data.user.name ?? data.user.username
							} hasn't added any rockets yet.`}
						</div>
					)}
				</div>
				{data.user.host.ships.length > 9 ? (
					<div className="mt-20 text-center">
						<ButtonLink
							to={`/search?${new URLSearchParams({
								hostId: data.user.host.userId,
							})}`}
							variant="secondary"
							size="md"
						>
							View all
						</ButtonLink>
					</div>
				) : null}
			</div>

			<Reviews
				title={`${data.user.host.reviews.length} reviews from renters`}
				user={data.user}
				rating={data.rating}
				reviews={data.user.host.reviews}
				reviewerType="renter"
			/>
		</div>
	)
}

export function ErrorBoundary() {
	return (
		<GeneralErrorBoundary
			statusHandlers={{
				404: ({ params }) => (
					<p>{params.username} does not have a host profile</p>
				),
			}}
		/>
	)
}

export const meta: V2_MetaFunction<typeof loader> = ({ data, params }) => {
	const displayName = data?.user.name ?? params.username
	return [
		{ title: `${displayName} | Rocket Rental Host` },
		{
			name: 'description',
			content: `Take a look at ${displayName}'s ${
				data?.user.host.ships.length ?? 'great'
			} rockets on Rocket Rental.`,
		},
	]
}

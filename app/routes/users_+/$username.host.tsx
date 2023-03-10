import * as Separator from '@radix-ui/react-separator'
import { json, redirect, type DataFunctionArgs } from '@remix-run/node'
import {
	Form,
	Link,
	useCatch,
	useLoaderData,
	useParams,
} from '@remix-run/react'
import invariant from 'tiny-invariant'
import { StarRatingDisplay } from '~/components/star-rating-display'
import { getUserId, requireUserId } from '~/utils/auth.server'
import { prisma } from '~/utils/db.server'
import { Button, ButtonLink } from '~/utils/forms'
import { getShipImgSrc, getUserImgSrc, useOptionalUser } from '~/utils/misc'

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
	const totalReviews = await prisma.hostReview.count({
		where: { subjectId: user.id },
	})
	const averageReviews = await prisma.hostReview.aggregate({
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
		totalReviews,
		rating: averageReviews._avg.rating,
	})
}

export async function action({ request, params }: DataFunctionArgs) {
	const formData = await request.formData()
	const loggedInUserId = await requireUserId(request)
	invariant(params.username, 'Missing username')
	const intent = formData.get('intent')
	if (intent === 'create-chat') {
		const existingChat = await prisma.chat.findFirst({
			where: {
				AND: [
					{ users: { some: { id: loggedInUserId } } },
					{ users: { some: { username: params.username } } },
				],
			},
			select: { id: true },
		})
		if (existingChat) {
			return redirect(`/chats/${existingChat.id}`)
		}

		const createdChat = await prisma.chat.create({
			select: { id: true },
			data: {
				users: {
					connect: [{ id: loggedInUserId }, { username: params.username }],
				},
			},
		})
		return redirect(`/chats/${createdChat.id}`)
	}
	throw new Error(`Unknown intent: ${intent}`)
}

export default function HostUserDisplay() {
	const data = useLoaderData<typeof loader>()

	// it's unclear why this is necessary 🤷‍♂️
	invariant(data.user.host, 'This should not be possible...')

	const loggedInUser = useOptionalUser()
	const isLoggedInUser = loggedInUser?.id === data.user.id

	return (
		<div className="mt-11">
			<div className="container mx-auto rounded-3xl bg-night-muted p-12">
				<div className="grid grid-cols-2 justify-items-center">
					<div className="relative w-52">
						<div className="absolute -top-40">
							<div className="relative">
								<img
									src={getUserImgSrc(data.user.imageId)}
									alt={data.user.username}
									className="h-52 w-52 rounded-full object-cover"
								/>
								{/* TODO: do not hardcode this */}
								{data.rating ? (
									<div className="absolute -bottom-3 flex w-full justify-center">
										<StarRatingDisplay rating={data.rating} />
									</div>
								) : null}
							</div>
						</div>
					</div>

					<div className="h-20" />

					<div className="flex flex-col items-center">
						<div className="flex items-center justify-start gap-4">
							<h1 className="text-center text-4xl font-bold text-white">
								{data.user.name ?? data.user.username}
							</h1>
							{isLoggedInUser ? null : data.oneOnOneChat ? (
								<ButtonLink
									to={`/chats/${data.oneOnOneChat.id}`}
									variant="primary"
									size="xs"
									title="Go to chat"
								>
									✉️ Message
								</ButtonLink>
							) : loggedInUser ? (
								<Form method="post">
									<Button
										variant="primary"
										size="xs"
										type="submit"
										name="intent"
										value="create-chat"
										title="Start new chat"
									>
										✉️ Message
									</Button>
								</Form>
							) : (
								<ButtonLink
									to={`/login?${new URLSearchParams({
										redirectTo: `/users/${data.user.username}/host`,
									})}`}
									variant="primary"
									size="xs"
									title="Login to message"
								>
									✉️ Message
								</ButtonLink>
							)}
						</div>
						<p className="mt-2 text-center text-gray-500">
							Joined {data.userJoinedDisplay}
						</p>
						{isLoggedInUser ? (
							<div className="mt-10 flex gap-4">
								<ButtonLink to="/chats" variant="primary" size="medium">
									✉️ My chat
								</ButtonLink>
								<ButtonLink
									to="/settings/profile"
									variant="secondary"
									size="medium"
								>
									✏️ Edit profile
								</ButtonLink>
							</div>
						) : null}
					</div>
					<div className="flex items-center justify-between justify-self-end text-center">
						<div className="min-w-[120px] px-5">
							<div className="text-3xl font-bold text-white">
								{data.totalBookings}
							</div>
							<span className="text-gray-500">trips</span>
						</div>
						<Separator.Root
							orientation="vertical"
							className="h-14 w-[1.5px] bg-night-lite"
						/>
						<div className="min-w-[120px] px-5">
							<div className="text-3xl font-bold text-white">
								{data.totalShips}
							</div>
							<span className="text-gray-500">rockets</span>
						</div>
						<Separator.Root
							orientation="vertical"
							className="h-14 w-[1.5px] bg-night-lite"
						/>
						<div className="min-w-[120px] px-5">
							<div className="text-3xl font-bold text-white">
								{data.totalReviews}
							</div>
							<span className="text-gray-500">reviews</span>
						</div>
					</div>
				</div>
			</div>
			<div className="container mx-auto mt-6">
				<div className="grid grid-cols-2 gap-6">
					<div className="rounded-3xl bg-night-muted p-10">
						<h2 className="font-3xl font-bold text-white">Verified Info</h2>
						<div className="mt-8 flex items-center justify-around text-center">
							<div className="flex flex-col items-center justify-center">
								<div className="flex h-8 w-8 items-center justify-center">
									🛡
								</div>
								<div className="mt-3 max-w-[92px] leading-5 text-label-light-gray">
									Approved to fly
								</div>
							</div>
							<Separator.Root
								orientation="vertical"
								className="h-14 w-[1.5px] bg-night-lite"
							/>
							<div className="flex flex-col items-center justify-center">
								<div className="flex h-8 w-8 items-center justify-center">
									🛡
								</div>
								<div className="mt-3 max-w-[92px] leading-5 text-label-light-gray">
									Email address
								</div>
							</div>
							<Separator.Root
								orientation="vertical"
								className="h-14 w-[1.5px] bg-night-lite"
							/>
							<div className="flex flex-col items-center justify-center">
								<div className="flex h-8 w-8 items-center justify-center">
									🛡
								</div>
								<div className="mt-3 max-w-[92px] leading-5 text-label-light-gray">
									Phone number
								</div>
							</div>
						</div>
						<h2 className="font-3xl mt-14 font-bold text-white">
							Share this profile
						</h2>
						<div className="mt-4 flex gap-4">
							<div className="flex h-12 w-12 items-center justify-center rounded-full bg-night-muted-dark text-white">
								f
							</div>
							<div className="flex h-12 w-12 items-center justify-center rounded-full bg-night-muted-dark text-white">
								t
							</div>
							<div className="flex h-12 w-12 items-center justify-center rounded-full bg-night-muted-dark text-white">
								i
							</div>
							<div className="flex h-12 w-12 items-center justify-center rounded-full bg-night-muted-dark text-white">
								c
							</div>
						</div>
					</div>
					<div className="rounded-3xl bg-night-muted p-10">
						<h2 className="font-3xl font-bold text-white">About</h2>
						<p className="mt-6 max-h-56 overflow-y-scroll text-label-light-gray">
							{data.user.host.bio ?? 'No bio provided'}
						</p>
					</div>
				</div>
			</div>
			<div className="container mx-auto mt-20">
				<h2 className="text-3xl font-bold text-white">
					{data.user.name ?? data.user.username}'s rockets
				</h2>
				<div className="mt-10 flex flex-wrap justify-center gap-6">
					{data.user.host.ships.slice(0, 9).map(ship => (
						<div
							key={ship.name}
							className="flex max-w-sm flex-col rounded-3xl bg-night-muted"
						>
							<Link to={`/ships/${ship.id}`}>
								<img
									className="aspect-[35/31] rounded-3xl"
									src={getShipImgSrc(ship.imageId)}
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
											<p className="font-bold text-white">
												{ship.model.brand.name}
											</p>
										</Link>
										<Separator.Root
											orientation="vertical"
											className="h-[16px] w-[1.5px] bg-night-lite"
										/>
										<Link
											to={`/search?${new URLSearchParams({
												modelId: ship.model.id,
											})}`}
										>
											<p className="text-label-light-gray">{ship.model.name}</p>
										</Link>
									</div>
									<Link to={`/ships/${ship.id}`}>
										<h3 className="text-3xl font-bold text-white">
											{ship.name}
										</h3>
									</Link>
								</div>
								<div className="mt-8 flex justify-between">
									<div className="flex items-baseline gap-1">
										<span className="text-2xl text-white">
											{ship.dailyChargeFormatted}
										</span>
										<span className="text-label-light-gray">day</span>
									</div>
									{ship.reviews.length ? (
										<Link to={`/ships/${ship.id}/reviews`}>
											<StarRatingDisplay rating={ship.averageRating} />
										</Link>
									) : null}
								</div>
							</div>
						</div>
					))}
				</div>
				{data.user.host.ships.length > 9 ? (
					<div className="mt-20 text-center">
						<ButtonLink
							to={`/search?${new URLSearchParams({
								hostId: data.user.host.userId,
							})}`}
							variant="secondary"
							size="medium"
						>
							View all
						</ButtonLink>
					</div>
				) : null}
			</div>

			<div className="container mx-auto mt-40">
				{data.totalReviews ? (
					<div>
						<div className="flex justify-between">
							<div className="flex gap-5">
								<h2 className="text-3xl font-bold text-white">
									{data.totalReviews} reviews from renters
								</h2>
								<StarRatingDisplay rating={data.rating ?? 0} />
							</div>
							<Link to="reviews" className="text-label-light-gray">
								View all
							</Link>
						</div>
						<div className="mt-10 flex snap-x gap-10 overflow-x-scroll">
							{data.user.host.reviews.map(review => (
								<div
									key={review.id}
									className="flex w-[440px] shrink-0 snap-start flex-col justify-between rounded-3xl border-[1px] border-gray-500 p-10"
								>
									<div>
										<div className="">⭐ ⭐ ⭐ ⭐ ⭑</div>
										<Link to={`/reviews/${review.id}`}>
											<div className="mt-6 h-[160px]">
												<p className="quote text-white line-clamp-5">
													{review.content.repeat(2)}
												</p>
											</div>
										</Link>
									</div>
									<div className="flex gap-4">
										<Link to={`/users/${review.reviewer.user.username}/renter`}>
											<img
												className="h-14 w-14 rounded-full"
												src={getUserImgSrc(review.reviewer.user.imageId)}
											/>
										</Link>
										<div className="flex flex-col gap-1">
											<Link
												to={`/users/${review.reviewer.user.username}/renter`}
											>
												<h3 className="text-base font-bold text-white">
													{review.reviewer.user.name ??
														review.reviewer.user.username}
												</h3>
											</Link>
											<Link
												to={`/ships/${review.booking.ship.id}`}
												className="text-sm text-gray-500"
											>
												{review.booking.ship.name}
											</Link>
										</div>
									</div>
								</div>
							))}
						</div>
					</div>
				) : (
					<div className="flex flex-col gap-10">
						<h2 className="text-3xl font-bold text-white">No reviews yet</h2>
						<div className="flex flex-col gap-3">
							<span>⭐️ ⭐️ ⭐️ ⭐️ ⭐️</span>
							<p className="text-label-light-gray">
								{data.user.name ?? data.user.username} hasn't received a review
								yet
							</p>
						</div>
					</div>
				)}
			</div>
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

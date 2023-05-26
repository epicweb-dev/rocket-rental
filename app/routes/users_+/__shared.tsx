import * as Separator from '@radix-ui/react-separator'
import { redirect } from '@remix-run/node'
import { Form, Link, useLocation } from '@remix-run/react'
import * as React from 'react'
import { StarRatingDisplay } from '~/components/star-rating-display.tsx'
import { prisma } from '~/utils/db.server.ts'
import { Button, ButtonLink } from '~/utils/forms.tsx'
import { getUserImgSrc } from '~/utils/misc.ts'

export async function createChat({
	loggedInUserId,
	username,
}: {
	loggedInUserId: string
	username: string
}) {
	const existingChat = await prisma.chat.findFirst({
		where: {
			AND: [
				{ users: { some: { id: loggedInUserId } } },
				{ users: { some: { username } } },
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
				connect: [{ id: loggedInUserId }, { username }],
			},
		},
	})
	return redirect(`/chats/${createdChat.id}`)
}

export function UserProfileBasicInfo({
	user,
	rating,
	userJoinedDisplay,
	userLoggedIn,
	isSelf,
	oneOnOneChatId,
	stats,
	bio,
}: {
	user: { imageId: string | null; username: string; name: string | null }
	oneOnOneChatId?: string | null
	userLoggedIn: boolean
	isSelf: boolean
	rating: number | null
	userJoinedDisplay: string
	stats: Array<{ num: number; label: string }>
	bio?: string | null
}) {
	const location = useLocation()
	return (
		<>
			<div className="container mx-auto rounded-3xl bg-night-500 p-12">
				<div className="grid grid-cols-2 justify-items-center">
					<div className="relative w-52">
						<div className="absolute -top-40">
							<div className="relative">
								<img
									src={getUserImgSrc(user.imageId)}
									alt={user.username}
									className="h-52 w-52 rounded-full object-cover"
								/>
								{rating ? (
									<div className="absolute -bottom-3 flex w-full justify-center">
										<StarRatingDisplay size="md" rating={rating} />
									</div>
								) : null}
							</div>
						</div>
					</div>

					<div className="h-20" />

					<div className="flex flex-col items-center">
						<div className="flex flex-wrap items-center justify-center gap-4">
							<h1 className="text-center text-h2">
								{user.name ?? user.username}
							</h1>
							{isSelf ? null : oneOnOneChatId ? (
								<ButtonLink
									to={`/chats/${oneOnOneChatId}`}
									variant="primary"
									size="xs"
									title="Go to chat"
								>
									✉️ Message
								</ButtonLink>
							) : userLoggedIn ? (
								<Form method="POST">
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
										redirectTo: location.pathname,
									})}`}
									variant="primary"
									size="xs"
									title="Login to message"
								>
									✉️ Message
								</ButtonLink>
							)}
						</div>
						<p className="mt-2 text-center text-night-200">
							Joined {userJoinedDisplay}
						</p>
						{isSelf ? (
							<div className="mt-10 flex gap-4">
								<ButtonLink to="/chats" variant="primary" size="md">
									✉️ My chat
								</ButtonLink>
								<ButtonLink
									to="/settings/profile"
									variant="secondary"
									size="md"
								>
									✏️ Edit profile
								</ButtonLink>
							</div>
						) : null}
					</div>
					<div className="flex items-center justify-between justify-self-end text-center">
						{stats.map(({ num, label }, index) => (
							<React.Fragment key={index}>
								{index > 0 ? (
									<Separator.Root
										orientation="vertical"
										className="h-14 w-[1.5px] bg-night-400"
									/>
								) : null}
								<div className="min-w-[120px] px-5">
									<div className="text-h3">{num}</div>
									<span className="text-night-200">{label}</span>
								</div>
							</React.Fragment>
						))}
					</div>
				</div>
			</div>
			<div className="container mx-auto mt-6">
				<div className="grid grid-cols-2 gap-6">
					<div className="rounded-3xl bg-night-500 p-10">
						<h2 className="text-h3">Verified Info</h2>
						<div className="mt-8 flex items-center justify-around text-center">
							<div className="flex flex-col items-center justify-center">
								<div className="flex h-8 w-8 items-center justify-center">
									🛡
								</div>
								<div className="mt-3 max-w-[92px] leading-5 text-night-200">
									Approved to fly
								</div>
							</div>
							<Separator.Root
								orientation="vertical"
								className="h-14 w-[1.5px] bg-night-400"
							/>
							<div className="flex flex-col items-center justify-center">
								<div className="flex h-8 w-8 items-center justify-center">
									🛡
								</div>
								<div className="mt-3 max-w-[92px] leading-5 text-night-200">
									Email address
								</div>
							</div>
							<Separator.Root
								orientation="vertical"
								className="h-14 w-[1.5px] bg-night-400"
							/>
							<div className="flex flex-col items-center justify-center">
								<div className="flex h-8 w-8 items-center justify-center">
									🛡
								</div>
								<div className="mt-3 max-w-[92px] leading-5 text-night-200">
									Phone number
								</div>
							</div>
						</div>
						<h2 className="font-3xl mt-14 font-bold">Share this profile</h2>
						<div className="mt-4 flex gap-4">
							<div className="flex h-12 w-12 items-center justify-center rounded-full bg-night-600">
								f
							</div>
							<div className="flex h-12 w-12 items-center justify-center rounded-full bg-night-600">
								t
							</div>
							<div className="flex h-12 w-12 items-center justify-center rounded-full bg-night-600">
								i
							</div>
							<div className="flex h-12 w-12 items-center justify-center rounded-full bg-night-600">
								c
							</div>
						</div>
					</div>
					<div className="flex flex-col rounded-3xl bg-night-500 p-10">
						<h2 className="font-3xl font-bold">About</h2>
						<div className="mt-6 max-h-56 flex-grow overflow-y-auto text-night-200">
							{bio
								? bio
										.split('\n')
										.map((line, index) => <p key={index}>{line}</p>)
								: 'No bio provided'}
						</div>
					</div>
				</div>
			</div>
		</>
	)
}

export function Reviews({
	title,
	user,
	rating,
	reviews,
	reviewerType,
}: {
	title: string
	user: { name: string | null; username: string }
	rating: number | null
	reviewerType: 'renter' | 'host'
	reviews: Array<{
		id: string
		content: string
		reviewer: {
			user: { name: string | null; username: string; imageId: string | null }
		}
		booking: {
			ship: {
				id: string
				name: string
			}
		}
	}>
}) {
	return (
		<div className="container mx-auto mt-40">
			{reviews.length ? (
				<div>
					<div className="flex justify-between">
						<div className="flex gap-5">
							<h2 className="text-h3">{title}</h2>
							<StarRatingDisplay size="sm" rating={rating ?? 0} />
						</div>
						<Link to="reviews" className="text-night-200">
							View all
						</Link>
					</div>
					<div className="mt-10 flex snap-x gap-10 overflow-x-scroll">
						{reviews.map(review => (
							<div
								key={review.id}
								className="flex w-[440px] shrink-0 snap-start flex-col justify-between rounded-3xl border-[1px] border-gray-500 p-10"
							>
								<div>
									<div className="">⭐ ⭐ ⭐ ⭐ ⭑</div>
									<Link to={`/reviews/${review.id}`}>
										<div className="mt-6 h-[160px]">
											<p className="quote line-clamp-5">{review.content}</p>
										</div>
									</Link>
								</div>
								<div className="flex gap-4">
									<Link
										to={`/users/${review.reviewer.user.username}/${reviewerType}`}
									>
										<img
											className="h-14 w-14 rounded-full"
											src={getUserImgSrc(review.reviewer.user.imageId)}
											alt={
												review.reviewer.user.name ??
												review.reviewer.user.username
											}
										/>
									</Link>
									<div className="flex flex-col gap-1">
										<Link
											to={`/users/${review.reviewer.user.username}/${reviewerType}`}
										>
											<h3 className="font-bold">
												{review.reviewer.user.name ??
													review.reviewer.user.username}
											</h3>
										</Link>
										<Link
											to={`/ships/${review.booking.ship.id}`}
											className="text-body-xs text-night-200"
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
					<h2 className="text-h3">No reviews yet</h2>
					<div className="flex flex-col gap-3">
						<span>⭐️ ⭐️ ⭐️ ⭐️ ⭐️</span>
						<p className="text-night-200">
							{user.name ?? user.username} hasn't received a review yet
						</p>
					</div>
				</div>
			)}
		</div>
	)
}

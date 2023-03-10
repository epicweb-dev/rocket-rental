import { json, type DataFunctionArgs } from '@remix-run/node'
import {
	useCatch,
	useFetcher,
	useLoaderData,
	useParams,
} from '@remix-run/react'
import invariant from 'tiny-invariant'
import { z } from 'zod'
import { StarRatingDisplay } from '~/components/star-rating-display'
import { prisma } from '~/utils/db.server'
import { ButtonLink, getFieldsFromSchema } from '~/utils/forms'
import { getUserImgSrc, useOptionalUser } from '~/utils/misc'

const MIN_BIO_LENGTH = 2
const MAX_BIO_LENGTH = 2000

const BioFormSchema = z.object({
	bio: z.string().min(MIN_BIO_LENGTH).max(MAX_BIO_LENGTH),
})

export async function loader({ params }: DataFunctionArgs) {
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
					bio: true,
					createdAt: true,
					ships: {
						select: {
							id: true,
							name: true,
							imageId: true,
							model: {
								select: {
									id: true,
									name: true,
									imageId: true,
									brand: {
										select: {
											id: true,
											name: true,
											imageId: true,
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
							description: true,
							rating: true,
							host: {
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
		where: { hostId: user.id },
	})
	const averageReviews = await prisma.hostReview.aggregate({
		where: { hostId: user.id },
		_avg: { rating: true },
	})

	return json({
		user,
		userJoinedDisplay: user.host.createdAt.toLocaleDateString(),
		totalBookings,
		totalShips,
		totalReviews,
		rating: averageReviews._avg.rating,
		fieldMetadata: getFieldsFromSchema(BioFormSchema),
	})
}

export default function HostUserDisplay() {
	const data = useLoaderData<typeof loader>()

	// it's unclear why this is necessary 🤷‍♂️
	invariant(data.user.host, 'This should not be possible...')

	const loggedInUser = useOptionalUser()
	const isLoggedInUser = loggedInUser?.id === data.user.id

	return (
		<div className="container mx-auto mt-11">
			<div className="rounded-3xl bg-night-muted p-12">
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
						<h1 className="text-center text-4xl font-bold text-white">
							{data.user.name ?? data.user.username}
						</h1>
						<p className="mt-2 text-center text-gray-500">
							Joined {data.userJoinedDisplay}
						</p>
						<div className="mt-10 flex gap-4">
							<ButtonLink to="/chat" variant="primary" size="medium">
								✉️ My chat
							</ButtonLink>
							{isLoggedInUser ? (
								<ButtonLink
									to="/settings/profile"
									variant="secondary"
									size="medium"
								>
									✏️ Edit profile
								</ButtonLink>
							) : null}
						</div>
					</div>
					<div className="flex items-center justify-between justify-self-end text-center">
						<div className="min-w-[120px] px-5">
							<div className="text-3xl font-bold text-white">
								{data.totalBookings}
							</div>
							<span className="text-gray-500">trips</span>
						</div>
						<div className="h-14 border-l-[1.5px] border-night-lite" />
						<div className="min-w-[120px] px-5">
							<div className="text-3xl font-bold text-white">
								{data.totalShips}
							</div>
							<span className="text-gray-500">rockets</span>
						</div>
						<div className="h-14 border-l-[1.5px] border-night-lite" />
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
							<div className="h-14 border-l-[1.5px] border-night-lite" />
							<div className="flex flex-col items-center justify-center">
								<div className="flex h-8 w-8 items-center justify-center">
									🛡
								</div>
								<div className="mt-3 max-w-[92px] leading-5 text-label-light-gray">
									Email address
								</div>
							</div>
							<div className="h-14 border-l-[1.5px] border-night-lite" />
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
							{(data.user.host.bio ?? 'No bio provided').repeat(100)}
						</p>
					</div>
				</div>
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

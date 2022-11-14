import type { LoaderArgs, ActionArgs } from '@remix-run/node'
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
import { useOptionalUser } from '~/utils/misc'

export async function loader({ params }: LoaderArgs) {
	invariant(params.username, 'Missing username')
	const user = await prisma.user.findUnique({
		where: { username: params.username },
		select: {
			id: true,
			username: true,
			host: {
				select: {
					bio: true,
					createdAt: true,
					ships: {
						select: {
							id: true,
							name: true,
							imageUrl: true,
							_count: {
								select: {
									// TODO: calculate only bookings they've had in the past
									// not the total number of bookings
									bookings: true,
								},
							},
							brand: {
								select: {
									id: true,
									name: true,
									imageUrl: true,
								},
							},
						},
					},
					// TODO: calculate overall review rating (average of all reviews)
					reviews: {
						select: {
							createdAt: true,
							id: true,
							description: true,
							host: {
								select: {
									user: {
										select: {
											imageUrl: true,
											name: true,
											username: true,
										},
									},
								},
							},
						},
					},
					renterReviews: {
						select: {
							createdAt: true,
							id: true,
							description: true,
							renter: {
								select: {
									user: {
										select: {
											imageUrl: true,
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
	if (!user) {
		throw new Response('not found', { status: 404 })
	}
	return json({ user })
}

const MIN_BIO_LENGTH = 2
const MAX_BIO_LENGTH = 2000

function validateBio(bio: string) {
	if (bio.length < MIN_BIO_LENGTH) return 'Bio too short'
	if (bio.length > MAX_BIO_LENGTH) return 'Bio too long'
	return null
}

export async function action({ request, params }: ActionArgs) {
	invariant(typeof params.username === 'string', 'Missing username param')
	const userId = await requireUserId(request)
	const user = await prisma.user.findUnique({
		where: { username: params.username },
		select: { id: true, host: { select: { userId: true } } },
	})
	if (userId !== user?.id) {
		return json({ status: 'unauthorized', errors: null } as const, {
			status: 401,
		})
	}
	const formData = await request.formData()

	const intent = formData.get('intent')
	switch (intent) {
		case 'update-bio': {
			const { bio } = Object.fromEntries(formData)
			invariant(typeof bio === 'string', 'bio type invalid')
			const errors = {
				bio: validateBio(bio),
			}
			const hasErrors = Object.values(errors).some(Boolean)
			if (hasErrors) {
				return json({ status: 'bio-invalid', errors } as const, {
					status: 400,
				})
			}
			await prisma.host.update({
				where: { userId },
				data: { bio },
			})
			return json({ status: 'bio-update-success', errors: null } as const)
		}
		case 'become-host': {
			if (user.host) {
				return json({ status: 'already-host', errors: null } as const, {
					status: 400,
				})
			}
			await prisma.host.create({
				data: {
					userId: user.id,
				},
			})
			return json({ status: 'become-host-success', errors: null } as const)
		}
		default: {
			return json({ status: 'Unhandled intent', errors: null } as const, {
				status: 400,
			})
		}
	}
}

export default function HostUserRoute() {
	const data = useLoaderData<typeof loader>()
	const user = useOptionalUser()
	const becomeHostFetcher = useFetcher()
	if (data.user.host) {
		return <HostUserDisplay />
	}
	if (user?.id === data.user.id) {
		return (
			<div>
				You are not yet a host. Would you like to become one?
				<becomeHostFetcher.Form method="post">
					<button type="submit" name="intent" value="become-host">
						Become a host
					</button>
				</becomeHostFetcher.Form>
			</div>
		)
	} else {
		return <div>This user is not a host... yet...</div>
	}
}

function HostUserDisplay() {
	const data = useLoaderData<typeof loader>()
	const user = useOptionalUser()
	const bioFetcher = useFetcher<typeof action>()
	const bioError = bioFetcher.data?.errors?.bio

	// we do this check earlier. Just added this to make TS happy
	invariant(data.user.host, 'User is not a host')

	return (
		<div>
			<h2>Host</h2>
			<pre>{JSON.stringify(data, null, 2)}</pre>
			{data.user.id === user?.id ? (
				<>
					<bioFetcher.Form method="post" noValidate>
						<div>
							<label
								htmlFor="bio"
								className="block text-sm font-medium text-gray-700"
							>
								Host Bio
							</label>
							<div className="mt-1">
								<textarea
									defaultValue={data.user.host.bio ?? ''}
									className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
									name="bio"
									id="bio"
									minLength={MIN_BIO_LENGTH}
									maxLength={MAX_BIO_LENGTH}
									aria-describedby={bioError ? 'end-date-error' : undefined}
									aria-invalid={bioError ? true : undefined}
								/>

								{bioError ? (
									<span className="pt-1 text-red-700" id="start-date-error">
										{bioError}
									</span>
								) : null}
							</div>
						</div>
						<button type="submit" name="intent" value="update-bio">
							{bioFetcher.state === 'idle' ? 'Submit' : 'Submitting...'}
						</button>
					</bioFetcher.Form>
				</>
			) : null}
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

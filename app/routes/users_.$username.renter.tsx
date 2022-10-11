import type { LoaderArgs, ActionArgs, SerializeFrom } from '@remix-run/node'
import { json } from '@remix-run/node'
import {
	Link,
	useCatch,
	useFetcher,
	useLoaderData,
	useParams,
} from '@remix-run/react'
import type { ErrorMessages, FormValidations } from 'remix-validity-state'
import { FormContextProvider } from 'remix-validity-state'
import { useValidatedInput, validateServerFormData } from 'remix-validity-state'
import invariant from 'tiny-invariant'
import { ListOfErrorMessages } from '~/components'
import { prisma } from '~/db.server'
import { requireUserId } from '~/services/auth.server'
import { constrain, useOptionalUser } from '~/utils/misc'

export async function loader({ params }: LoaderArgs) {
	invariant(params.username, 'Missing username')
	const user = await prisma.user.findUnique({
		where: { username: params.username },
		select: {
			id: true,
			username: true,
			renter: {
				select: {
					userId: true,
					bio: true,
					createdAt: true,
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
					hostReviews: {
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
					shipReviews: {
						select: {
							createdAt: true,
							id: true,
							description: true,
							ship: {
								select: {
									id: true,
									name: true,
									imageUrl: true,
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

const formValidations = constrain<FormValidations>()({
	bio: {
		minLength: 2,
		maxLength: 2000,
	},
})

const errorMessages = constrain<ErrorMessages>()({
	tooShort: (minLength, name) =>
		`The ${name} field must be at least ${minLength} characters`,
	tooLong: (maxLength, name) =>
		`The ${name} field must be less than ${maxLength} characters`,
})

export async function action({ request, params }: ActionArgs) {
	invariant(typeof params.username === 'string', 'Missing username param')
	const userId = await requireUserId(request)
	const user = await prisma.user.findUnique({
		where: { username: params.username },
		select: { id: true, renter: { select: { userId: true } } },
	})
	if (userId !== user?.id) {
		return json({ type: 'unauthorized' } as const, { status: 401 })
	}
	const formData = await request.formData()

	const intent = formData.get('intent')
	switch (intent) {
		case 'update-bio': {
			const serverFormInfo = await validateServerFormData(
				formData,
				formValidations,
			)
			if (!serverFormInfo.valid) {
				return json({ type: 'bio-invalid', serverFormInfo } as const, {
					status: 400,
				})
			}
			const { bio } = serverFormInfo.submittedFormData
			await prisma.renter.update({
				where: { userId },
				data: { bio },
			})
			return json({ type: 'bio-update-success' } as const)
		}
		case 'become-renter': {
			if (user.renter) {
				return json({ type: 'already-renter' } as const, { status: 400 })
			}
			await prisma.renter.create({
				data: {
					userId: user.id,
				},
			})
			return json({ type: 'become-renter-success' } as const)
		}
		default: {
			return json({ type: 'Unhandled intent' } as const, { status: 400 })
		}
	}
}

// TODO: remove the wrapper thing when this is fixed: https://github.com/brophdawg11/remix-validity-state/issues/14
export default function TempRenterUserRouteParent() {
	return (
		<FormContextProvider value={{ formValidations, errorMessages }}>
			<RenterUserRoute />
		</FormContextProvider>
	)
}

function RenterUserRoute() {
	const data = useLoaderData<typeof loader>()
	const user = useOptionalUser()
	const becomeRenterFetcher = useFetcher()
	if (data.user.renter) {
		return <RenterUserDisplay />
	}
	if (user?.id === data.user.id) {
		return (
			<div>
				You are not yet a renter. Would you like to become one?
				<becomeRenterFetcher.Form method="post">
					<button type="submit" name="intent" value="become-renter">
						Become a renter
					</button>
				</becomeRenterFetcher.Form>
			</div>
		)
	} else {
		return <div>This user is not a renter... yet...</div>
	}
}

function RenterUserDisplay() {
	const data = useLoaderData<typeof loader>()
	const user = useOptionalUser()
	const bioFetcher = useFetcher<SerializeFrom<typeof action>>()
	const bioField = useValidatedInput({
		name: 'bio',
		formValidations,
		errorMessages,
		serverFormInfo:
			bioFetcher.data?.type === 'bio-invalid'
				? bioFetcher.data.serverFormInfo
				: undefined,
	})

	// we do this check earlier. Just added this to make TS happy
	invariant(data.user.renter, 'User is not a renter')

	return (
		<div>
			<h2>Renter</h2>
			<pre>{JSON.stringify(data, null, 2)}</pre>
			{data.user.id === user?.id ? (
				<>
					<bioFetcher.Form method="post">
						<div>
							<label
								{...bioField.getLabelAttrs({
									className: 'block text-sm font-medium text-gray-700',
								})}
							>
								Renter Bio
							</label>
							<div className="mt-1">
								{/* TODO: change this to textarea when this is implemented: https://github.com/brophdawg11/remix-validity-state/issues/15 */}
								<input
									{...bioField.getInputAttrs({
										defaultValue: data.user.renter.bio ?? '',
										autoFocus: true,
										className:
											'w-full rounded border border-gray-500 px-2 py-1 text-lg',
									})}
								/>

								<ListOfErrorMessages info={bioField.info} />
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

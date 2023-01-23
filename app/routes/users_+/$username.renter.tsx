import type { DataFunctionArgs } from '@remix-run/node'
import { json } from '@remix-run/node'
import {
	useCatch,
	useFetcher,
	useLoaderData,
	useParams,
} from '@remix-run/react'
import invariant from 'tiny-invariant'
import { z } from 'zod'
import { requireUserId } from '~/utils/auth.server'
import { prisma } from '~/utils/db.server'
import { getFieldsFromSchema, preprocessFormData, useForm } from '~/utils/forms'
import { useOptionalUser } from '~/utils/misc'

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
			renter: {
				select: {
					userId: true,
					bio: true,
					createdAt: true,
					_count: {
						select: {
							bookings: true,
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
					hostReviews: {
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
					shipReviews: {
						select: {
							createdAt: true,
							id: true,
							description: true,
							rating: true,
							ship: {
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
		},
	})
	if (!user) {
		throw new Response('not found', { status: 404 })
	}
	return json({ user, fieldMetadata: getFieldsFromSchema(BioFormSchema) })
}

export async function action({ request, params }: DataFunctionArgs) {
	invariant(typeof params.username === 'string', 'Missing username param')
	const userId = await requireUserId(request)
	const user = await prisma.user.findUnique({
		where: { username: params.username },
		select: { id: true, renter: { select: { userId: true } } },
	})
	if (userId !== user?.id) {
		return json({ status: 'unauthorized' } as const, {
			status: 401,
		})
	}
	const formData = await request.formData()

	const intent = formData.get('intent')
	switch (intent) {
		case 'update-bio': {
			const result = BioFormSchema.safeParse(
				preprocessFormData(formData, BioFormSchema),
			)
			if (!result.success) {
				return json(
					{ status: 'bio-invalid', errors: result.error.flatten() } as const,
					{ status: 400 },
				)
			}
			const { bio } = result.data
			await prisma.renter.update({
				where: { userId },
				data: { bio },
			})
			return json({ status: 'bio-update-success' } as const)
		}
		case 'become-renter': {
			if (user.renter) {
				return json({ status: 'already-renter' } as const, {
					status: 400,
				})
			}
			await prisma.renter.create({
				data: {
					userId: user.id,
				},
			})
			return json({ status: 'become-renter-success' } as const)
		}
		default: {
			return json({ status: 'Unhandled intent' } as const, {
				status: 400,
			})
		}
	}
}

export default function RenterUserRoute() {
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
	const bioFetcher = useFetcher<typeof action>()

	// we do this check earlier. Just added this to make TS happy
	invariant(data.user.renter, 'User is not a renter')

	const { form, fields } = useForm({
		name: 'bio',
		errors:
			bioFetcher.data?.status === 'bio-invalid'
				? bioFetcher.data?.errors
				: null,
		fieldMetadatas: data.fieldMetadata,
	})

	return (
		<div>
			<h2>Renter</h2>
			<pre>{JSON.stringify(data, null, 2)}</pre>
			{data.user.id === user?.id ? (
				<>
					<bioFetcher.Form method="post" {...form.props}>
						<div>
							<label
								className="block text-sm font-medium text-gray-700"
								{...fields.bio.labelProps}
							>
								Renter Bio
							</label>
							<div className="mt-1">
								<textarea
									defaultValue={data.user.renter.bio ?? ''}
									className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
									{...fields.bio.props}
								/>

								{fields.bio.errorUI}
							</div>
						</div>
						{form.errorUI}
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

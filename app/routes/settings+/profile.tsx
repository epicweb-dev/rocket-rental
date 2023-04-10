import { json, type DataFunctionArgs, redirect } from '@remix-run/node'
import {
	Form,
	Link,
	Outlet,
	useActionData,
	useFetcher,
	useFormAction,
	useLoaderData,
	useNavigation,
} from '@remix-run/react'
import { useEffect, useRef } from 'react'
import { z } from 'zod'
import * as createHost from '~/routes/resources+/create-host'
import * as createRenter from '~/routes/resources+/create-renter'
import {
	authenticator,
	getPasswordHash,
	requireUserId,
	verifyLogin,
} from '~/utils/auth.server'
import { prisma } from '~/utils/db.server'
import {
	Button,
	ErrorList,
	Field,
	getFieldsFromSchema,
	preprocessFormData,
	TextareaField,
	useForm,
} from '~/utils/forms'
import { getUserImgSrc } from '~/utils/misc'
import {
	emailSchema,
	nameSchema,
	passwordSchema,
	usernameSchema,
} from '~/utils/user-validation'

const ProfileFormSchema = z
	.object({
		name: nameSchema.optional(),
		username: usernameSchema,
		email: emailSchema.optional(),
		phone: z.string().optional(),
		address: z.string().optional(),
		city: z.string().optional(),
		state: z.string().optional(),
		zip: z.string().optional(),
		country: z.string().optional(),
		hostBio: z.string().optional(),
		renterBio: z.string().optional(),
		currentPassword: z
			.union([passwordSchema, z.string().min(0).max(0)])
			.optional(),
		newPassword: z.union([passwordSchema, z.string().min(0).max(0)]).optional(),
	})
	.superRefine(async ({ username, currentPassword, newPassword }, ctx) => {
		if (newPassword && !currentPassword) {
			ctx.addIssue({
				path: ['newPassword'],
				code: 'custom',
				message: 'Must provide current password to change password.',
			})
		}
		if (currentPassword && newPassword) {
			const user = await verifyLogin(username, currentPassword)
			if (!user) {
				ctx.addIssue({
					path: ['currentPassword'],
					code: 'custom',
					message: 'Incorrect password.',
				})
			}
		}
	})

export async function loader({ request }: DataFunctionArgs) {
	const userId = await requireUserId(request)
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: {
			id: true,
			name: true,
			username: true,
			email: true,
			imageId: true,
			contactInfo: {
				select: {
					id: true,
					phone: true,
					address: true,
					city: true,
					state: true,
					zip: true,
					country: true,
				},
			},
			host: { select: { bio: true } },
			renter: { select: { bio: true } },
		},
	})
	if (!user) {
		throw await authenticator.logout(request, { redirectTo: '/' })
	}
	return json({ user, fieldMetadatas: getFieldsFromSchema(ProfileFormSchema) })
}

export async function action({ request }: DataFunctionArgs) {
	const userId = await requireUserId(request)
	const formData = await request.formData()
	const result = await ProfileFormSchema.safeParseAsync(
		preprocessFormData(formData, ProfileFormSchema),
	)

	if (!result.success) {
		return json({ status: 'error', errors: result.error.flatten() } as const, {
			status: 400,
		})
	}

	const {
		name,
		username,
		email,
		currentPassword,
		newPassword,
		renterBio,
		hostBio,
		...contactInfo
	} = result.data

	if (email) {
		// TODO: send a confirmation email
	}

	const updatedUser = await prisma.user.update({
		select: { id: true, username: true },
		where: { id: userId },
		data: {
			name,
			username,
			// We intentionally do not update the email because they have to confirm
			// their email address change first.
			contactInfo: {
				upsert: {
					create: contactInfo,
					update: contactInfo,
				},
			},
			password: newPassword
				? {
						update: {
							hash: await getPasswordHash(newPassword),
						},
				  }
				: undefined,
			host:
				typeof hostBio === 'string' ? { update: { bio: hostBio } } : undefined,
			renter:
				typeof renterBio === 'string'
					? { update: { bio: renterBio } }
					: undefined,
		},
	})

	return redirect(`/users/${updatedUser.username}`, { status: 302 })
}

function usePreviousValue<Value>(value: Value): Value {
	const ref = useRef<Value>(value)
	useEffect(() => {
		ref.current = value
	}, [value])
	return ref.current
}

export default function EditUserProfile() {
	const data = useLoaderData<typeof loader>()
	const actionData = useActionData<typeof action>()
	const navigation = useNavigation()
	const formAction = useFormAction()
	const createHostFetcher = useFetcher<typeof createHost.action>()
	const createRenterFetcher = useFetcher<typeof createRenter.action>()

	const hostBioTextareaRef = useRef<HTMLTextAreaElement>(null)
	const renterBioTextareaRef = useRef<HTMLTextAreaElement>(null)

	const isSubmitting =
		navigation.state === 'submitting' &&
		navigation.formAction === formAction &&
		navigation.formMethod === 'POST'

	const prevWasHost = usePreviousValue(Boolean(data.user.host))
	const isNewHost = !prevWasHost && Boolean(data.user.host)
	useEffect(() => {
		if (!hostBioTextareaRef.current) return
		if (isNewHost) {
			hostBioTextareaRef.current.focus()
		}
	}, [isNewHost])

	const prevWasRenter = usePreviousValue(Boolean(data.user.renter))
	const isNewRenter = !prevWasRenter && Boolean(data.user.renter)
	useEffect(() => {
		if (!renterBioTextareaRef.current) return
		if (isNewRenter) {
			renterBioTextareaRef.current.focus()
		}
	}, [isNewRenter])

	const { form, fields } = useForm({
		name: 'edit-profile',
		errors: actionData?.status === 'error' ? actionData.errors : null,
		fieldMetadatas: data.fieldMetadatas,
	})

	const createHostFormId = 'create-host-form'
	const createRenterFormId = 'create-renter-form'
	return (
		<div className="container m-auto mb-36 mt-16 max-w-3xl">
			<div className="flex gap-3">
				<Link className="text-night-300" to={`/users/${data.user.username}`}>
					Profile
				</Link>
				<span className="text-night-300">▶️</span>
				<span>Edit Profile</span>
			</div>
			<div className="mt-16 flex flex-col gap-12">
				<div className="flex justify-center">
					<div className="relative h-52 w-52">
						<img
							src={getUserImgSrc(data.user.imageId)}
							alt={data.user.username}
							className="h-full w-full rounded-full object-cover"
						/>
						<Link
							to="photo"
							className="absolute -right-3 top-3 flex h-4 w-4 items-center justify-center rounded-full border-4 border-night-700 bg-night-500 p-5"
							title="Change profile photo"
							aria-label="Change profile photo"
						>
							📷
						</Link>
					</div>
				</div>
				<Form method="POST" {...form.props}>
					<div className="grid grid-cols-6 gap-x-10">
						<Field
							className="col-span-3"
							labelProps={{
								...fields.username.labelProps,
								children: 'Username',
							}}
							inputProps={{
								...fields.username.props,
								defaultValue: data.user.username,
							}}
							errors={fields.username.errors}
						/>
						<Field
							className="col-span-3"
							labelProps={{ ...fields.name.labelProps, children: 'Name' }}
							inputProps={{
								...fields.name.props,
								defaultValue: data.user.name ?? '',
							}}
							errors={fields.name.errors}
						/>
						<Field
							className="col-span-3"
							labelProps={{ ...fields.email.labelProps, children: 'Email' }}
							inputProps={{
								...fields.email.props,
								defaultValue: data.user.email ?? '',
								// TODO: support changing your email address
								disabled: true,
							}}
							errors={fields.email.errors}
						/>
						<Field
							className="col-span-3"
							labelProps={{ ...fields.phone.labelProps, children: 'Phone' }}
							inputProps={{
								...fields.phone.props,
								defaultValue: data.user.contactInfo?.phone ?? '',
							}}
							errors={fields.phone.errors}
						/>
						<Field
							className="col-span-3"
							labelProps={{ ...fields.address.labelProps, children: 'Address' }}
							inputProps={{
								...fields.address.props,
								defaultValue: data.user.contactInfo?.address ?? '',
							}}
							errors={fields.address.errors}
						/>
						<Field
							className="col-span-3"
							labelProps={{ ...fields.city.labelProps, children: 'City' }}
							inputProps={{
								...fields.city.props,
								defaultValue: data.user.contactInfo?.city ?? '',
							}}
							errors={fields.city.errors}
						/>
						<Field
							className="col-span-2"
							labelProps={{ ...fields.state.labelProps, children: 'State' }}
							inputProps={{
								...fields.state.props,
								defaultValue: data.user.contactInfo?.state ?? '',
							}}
							errors={fields.state.errors}
						/>
						<Field
							className="col-span-2"
							labelProps={{ ...fields.zip.labelProps, children: 'Zip' }}
							inputProps={{
								...fields.zip.props,
								defaultValue: data.user.contactInfo?.zip ?? '',
							}}
							errors={fields.zip.errors}
						/>
						<Field
							className="col-span-2"
							labelProps={{ ...fields.country.labelProps, children: 'Country' }}
							inputProps={{
								...fields.country.props,
								defaultValue: data.user.contactInfo?.country ?? '',
							}}
							errors={fields.country.errors}
						/>

						<div className="relative col-span-3">
							{data.user.host ? null : (
								<div className="absolute inset-0 z-10 backdrop-blur-[1px]" />
							)}
							<TextareaField
								labelProps={{
									...fields.hostBio.labelProps,
									children: 'Host Bio',
								}}
								textareaProps={{
									...fields.hostBio.props,
									defaultValue: data.user.host?.bio ?? '',
									disabled: !data.user.host,
									ref: hostBioTextareaRef,
								}}
							/>
							{data.user.host ? null : (
								<div className="absolute inset-0 z-20 flex items-center justify-center">
									<div className="flex min-h-[70px] w-[300px] flex-col items-center drop-shadow-md">
										<Button
											size="sm"
											variant="secondary"
											type="submit"
											form={createHostFormId}
											aria-describedby={
												createHostFetcher.data?.status === 'error'
													? 'create-host-error'
													: undefined
											}
										>
											Become a Host
										</Button>
										<div className="px-4 pt-1">
											<ErrorList
												id="create-host-error"
												errors={
													createHostFetcher.data?.status === 'error'
														? createHostFetcher.data.errors
														: null
												}
											/>
										</div>
									</div>
								</div>
							)}
						</div>
						<div className="relative col-span-3">
							{data.user.renter ? null : (
								<div className="absolute inset-0 z-10 backdrop-blur-[1px]" />
							)}
							<TextareaField
								className="col-span-3"
								labelProps={{
									...fields.renterBio.labelProps,
									children: 'Renter Bio',
								}}
								textareaProps={{
									...fields.renterBio.props,
									defaultValue: data.user.renter?.bio ?? '',
									disabled: !data.user.renter,
									ref: renterBioTextareaRef,
								}}
							/>
							{data.user.renter ? null : (
								<div className="absolute inset-0 z-20 flex items-center justify-center">
									<div className="flex min-h-[70px] w-[300px] flex-col items-center drop-shadow-md">
										<Button
											size="sm"
											variant="secondary"
											type="submit"
											form={createRenterFormId}
											aria-describedby={
												createRenterFetcher.data?.status === 'error'
													? 'create-renter-error'
													: undefined
											}
										>
											Become a Renter
										</Button>
										<div className="px-4 pt-1">
											<ErrorList
												id="create-renter-error"
												errors={
													createRenterFetcher.data?.status === 'error'
														? createRenterFetcher.data.errors
														: null
												}
											/>
										</div>
									</div>
								</div>
							)}
						</div>
						<div className="col-span-6 mb-12 mt-6 h-1 border-b-[1.5px] border-night-500" />
						<fieldset className="col-span-6">
							<legend className="pb-6 text-lg text-night-200">
								Change password
							</legend>
							<div className="flex justify-between gap-10">
								<Field
									className="flex-1"
									labelProps={{
										...fields.currentPassword.labelProps,
										children: 'Current Password',
									}}
									inputProps={{
										...fields.currentPassword.props,
										type: 'password',
										autoComplete: 'current-password',
									}}
									errors={fields.currentPassword.errors}
								/>
								<Field
									className="flex-1"
									labelProps={{
										...fields.newPassword.labelProps,
										children: 'New Password',
									}}
									inputProps={{
										...fields.newPassword.props,
										type: 'password',
										autoComplete: 'new-password',
									}}
									errors={fields.newPassword.errors}
								/>
							</div>
						</fieldset>
					</div>

					{form.errorUI}

					<div className="mt-3 flex justify-center">
						<Button
							type="submit"
							size="md-wide"
							variant="primary"
							status={isSubmitting ? 'pending' : actionData?.status ?? 'idle'}
						>
							Save changes
						</Button>
					</div>
				</Form>

				<createHostFetcher.Form
					method="POST"
					action={createHost.ROUTE_PATH}
					id={createHostFormId}
				/>
				<createRenterFetcher.Form
					method="POST"
					action={createRenter.ROUTE_PATH}
					id={createRenterFormId}
				/>
			</div>
			<Outlet />
		</div>
	)
}

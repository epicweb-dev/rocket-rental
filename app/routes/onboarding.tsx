import type { DataFunctionArgs, V2_MetaFunction } from '@remix-run/node'
import { json, redirect } from '@remix-run/node'
import {
	Form,
	Link,
	useActionData,
	useLoaderData,
	useSearchParams,
} from '@remix-run/react'
import { z } from 'zod'
import { createUser } from '~/models/user.server'
import { authenticator } from '~/utils/auth.server'
import {
	getFields,
	getFieldMetadatas,
	getFormProps,
	preprocessFormData,
} from '~/utils/forms'
import { safeRedirect } from '~/utils/misc'
import { commitSession, getSession } from '~/utils/session.server'
import {
	nameSchema,
	passwordSchema,
	usernameSchema,
} from '~/utils/user-validation'
import { onboardingEmailSessionKey } from './signup'

const onboardingFormSchema = z
	.object({
		username: usernameSchema,
		name: nameSchema,
		password: passwordSchema,
		confirmPassword: passwordSchema,
		agreeToTermsOfServiceAndPrivacyPolicy: z.boolean().refine(val => val, {
			message: 'You must agree to the terms of service and privacy policy',
		}),
		agreeToMailingList: z.boolean(),
		remember: z.boolean(),
		redirectTo: z.string().optional(),
	})
	.superRefine(({ confirmPassword, password }, ctx) => {
		if (confirmPassword !== password) {
			ctx.addIssue({
				path: ['confirmPassword'],
				code: 'custom',
				message: 'The passwords did not match',
			})
		}
	})

export async function loader({ request }: DataFunctionArgs) {
	await authenticator.isAuthenticated(request, {
		successRedirect: '/',
	})
	const session = await getSession(request.headers.get('cookie'))
	const error = session.get(authenticator.sessionErrorKey)
	const onboardingEmail = session.get(onboardingEmailSessionKey)
	if (typeof onboardingEmail !== 'string' || !onboardingEmail) {
		return redirect('/signup')
	}
	return json(
		{
			formError: error?.message,
			onboardingEmail,
			fieldMetadatas: getFieldMetadatas(onboardingFormSchema),
		},
		{
			headers: {
				'Set-Cookie': await commitSession(session),
			},
		},
	)
}

export async function action({ request }: DataFunctionArgs) {
	const session = await getSession(request.headers.get('cookie'))
	const email = session.get(onboardingEmailSessionKey)
	if (typeof email !== 'string' || !email) {
		return redirect('/signup')
	}

	const formData = await request.formData()
	const result = onboardingFormSchema.safeParse(
		preprocessFormData(formData, onboardingFormSchema),
	)
	if (!result.success) {
		return json(
			{ status: 'error', errors: result.error.flatten() },
			{ status: 400 },
		)
	}
	const {
		username,
		name,
		password,
		// TODO: add user to mailing list if they agreed to it
		// agreeToMailingList,
		remember,
		redirectTo,
	} = result.data

	const user = await createUser({ email, username, password, name })
	session.set(authenticator.sessionKey, user.id)
	session.unset(onboardingEmailSessionKey)

	const newCookie = await commitSession(session, {
		maxAge: remember
			? 60 * 60 * 24 * 7 // 7 days
			: undefined,
	})
	return redirect(safeRedirect(redirectTo, '/'), {
		headers: { 'Set-Cookie': newCookie },
	})
}

export const meta: V2_MetaFunction = ({ matches }) => {
	let rootModule = matches.find(match => match.route.id === 'root')

	return [
		...(rootModule?.meta ?? [])?.filter(meta => !('title' in meta)),
		{ title: 'Setup Rocket Rental Account' },
	]
}

export default function OnboardingPage() {
	const [searchParams] = useSearchParams()
	const data = useLoaderData<typeof loader>()
	const actionData = useActionData<typeof action>()
	const fields = getFields(data.fieldMetadatas, actionData?.errors.fieldErrors)
	const form = getFormProps({
		name: 'onboarding',
		errors: [...(actionData?.errors.formErrors ?? []), data.formError],
	})

	const redirectTo = searchParams.get('redirectTo') || '/'

	return (
		<div className="flex min-h-full flex-col justify-center">
			<div className="mx-auto w-full max-w-md px-8">
				<Form method="post" className="space-y-6" noValidate {...form.props}>
					<div>Onboarding for {data.onboardingEmail}</div>
					<div>
						<label
							className="block text-sm font-medium text-gray-700"
							{...fields.username.labelProps}
						>
							Username
						</label>
						<div className="mt-1">
							<input
								autoFocus={true}
								autoComplete="username"
								className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
								{...fields.username.props}
							/>
							{fields.username.errorUI}
						</div>
					</div>

					<div>
						<label
							className="block text-sm font-medium text-gray-700"
							{...fields.name.labelProps}
						>
							Name
						</label>
						<div className="mt-1">
							<input
								autoComplete="name"
								className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
								{...fields.name.props}
							/>
							{fields.name.errorUI}
						</div>
					</div>

					<div>
						<label
							className="block text-sm font-medium text-gray-700"
							{...fields.password.labelProps}
						>
							Password
						</label>
						<div className="mt-1">
							<input
								className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
								autoComplete="new-password"
								{...fields.password.props}
								type="password"
							/>
							{fields.password.errorUI}
						</div>
					</div>

					<div>
						<label
							className="block text-sm font-medium text-gray-700"
							{...fields.confirmPassword.labelProps}
						>
							Confirm Password
						</label>
						<div className="mt-1">
							<input
								autoComplete="new-password"
								className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
								{...fields.confirmPassword.props}
								type="password"
							/>
							{fields.confirmPassword.errorUI}
						</div>
					</div>

					<div>
						<div className="flex items-center">
							<input
								className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
								{...fields.agreeToTermsOfServiceAndPrivacyPolicy.props}
							/>
							<label
								className="ml-2 block text-sm text-gray-900"
								{...fields.agreeToTermsOfServiceAndPrivacyPolicy.labelProps}
							>
								Do you agree to our Terms of Service and Privacy Policy?
							</label>
						</div>
						{fields.agreeToTermsOfServiceAndPrivacyPolicy.errorUI}
					</div>

					<div>
						<div className="flex items-center">
							<input
								className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
								{...fields.agreeToMailingList.props}
							/>
							<label
								className="ml-2 block text-sm text-gray-900"
								{...fields.agreeToMailingList.labelProps}
							>
								Would you like to receive special discounts and offers?
							</label>
						</div>
						{fields.agreeToMailingList.errorUI}
					</div>

					<div className="flex items-center">
						<input
							className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
							{...fields.remember.props}
						/>
						<label
							className="ml-2 block text-sm text-gray-900"
							{...fields.remember.labelProps}
						>
							Remember me
						</label>
					</div>

					<input
						{...fields.redirectTo.props}
						type="hidden"
						value={redirectTo}
					/>

					{form.errorUI}

					<div className="flex items-center justify-between gap-6">
						<button
							type="submit"
							className="w-full rounded bg-gray-500  py-2 px-4 text-white hover:bg-gray-600 focus:bg-gray-400"
						>
							Sign up
						</button>
					</div>
				</Form>
				<Link to="/login" className="text-blue-600 underline">
					Been here before?
				</Link>
			</div>
		</div>
	)
}

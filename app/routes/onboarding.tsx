import type { DataFunctionArgs, MetaFunction } from '@remix-run/node'
import { json, redirect } from '@remix-run/node'
import {
	Form,
	Link,
	useActionData,
	useLoaderData,
	useSearchParams,
} from '@remix-run/react'
import * as React from 'react'
import invariant from 'tiny-invariant'
import { createUser } from '~/models/user.server'
import {
	MAX_NAME_LENGTH,
	MAX_PASSWORD_LENGTH,
	MAX_USERNAME_LENGTH,
	MIN_NAME_LENGTH,
	MIN_PASSWORD_LENGTH,
	MIN_USERNAME_LENGTH,
	validateConfirmPassword,
	validateName,
	validatePassword,
	validateUsername,
} from '~/utils/user-validation'
import { authenticator } from '~/utils/auth.server'
import { commitSession, getSession } from '~/utils/session.server'
import { getErrorInfo, safeRedirect } from '~/utils/misc'
import { onboardingEmailSessionKey } from './signup'

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
		{ formError: error?.message, onboardingEmail },
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
	const {
		username,
		name,
		password,
		confirmPassword,
		agreeToTermsOfServiceAndPrivacyPolicy,
		agreeToMailingList,
		remember,
		redirectTo,
	} = Object.fromEntries(formData)
	invariant(typeof username === 'string', 'username type invalid')
	invariant(typeof name === 'string', 'name type invalid')
	invariant(typeof password === 'string', 'password type invalid')
	invariant(typeof confirmPassword === 'string', 'confirmPassword type invalid')
	invariant(
		typeof agreeToTermsOfServiceAndPrivacyPolicy === 'string' ||
			agreeToTermsOfServiceAndPrivacyPolicy == null,
		'agreeToTermsOfServiceAndPrivacyPolicy type invalid',
	)
	invariant(
		typeof agreeToMailingList === 'string' || agreeToMailingList == null,
		'agreeToMailingList type invalid',
	)

	// TODO: the type of remember is wrong after this invariant.
	// it can be a string or undefined or null, but it's only a string...
	invariant(
		typeof remember === 'string' || remember == null,
		'remember type invalid',
	)
	invariant(typeof redirectTo === 'string', 'redirectTo type invalid')

	const errors = {
		username: validateUsername(username),
		name: validateName(name),
		password: validatePassword(password),
		confirmPassword: validateConfirmPassword({ password, confirmPassword }),
		agreeToTermsOfServiceAndPrivacyPolicy:
			agreeToTermsOfServiceAndPrivacyPolicy === 'on'
				? null
				: 'You must agree to the terms of service and privacy policy',
	}
	const hasErrors = Object.values(errors).some(Boolean)
	if (hasErrors) {
		return json({ status: 'error', errors }, { status: 400 })
	}

	const user = await createUser({ email, username, password, name })
	session.set(authenticator.sessionKey, user.id)
	session.unset(onboardingEmailSessionKey)

	// TODO: add user to mailing list if they agreed to it

	const newCookie = await commitSession(session, {
		maxAge: remember
			? 60 * 60 * 24 * 7 // 7 days
			: undefined,
	})
	return redirect(safeRedirect(redirectTo, '/'), {
		headers: { 'Set-Cookie': newCookie },
	})
}

export const meta: MetaFunction = () => {
	return {
		title: 'Setup Rocket Rental Account',
	}
}

export default function OnboardingPage() {
	const [searchParams] = useSearchParams()
	const data = useLoaderData<typeof loader>()
	const actionData = useActionData<typeof action>()
	const errorInfo = getErrorInfo({
		errors: actionData?.errors,
		names: [
			'username',
			'name',
			'password',
			'confirmPassword',
			'agreeToTermsOfServiceAndPrivacyPolicy',
		],
		ui: <span className="pt-1 text-red-700" />,
	})
	const redirectTo = searchParams.get('redirectTo') || '/'

	return (
		<div className="flex min-h-full flex-col justify-center">
			<div className="mx-auto w-full max-w-md px-8">
				<Form
					method="post"
					className="space-y-6"
					aria-invalid={data.formError ? true : undefined}
					aria-describedby="form-error"
					noValidate
				>
					<div>Onboarding for {data.onboardingEmail}</div>
					<div>
						<label
							htmlFor="username"
							className="block text-sm font-medium text-gray-700"
						>
							Username
						</label>
						<div className="mt-1">
							<input
								id="username"
								name="username"
								autoFocus={true}
								autoComplete="username"
								className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
								minLength={MIN_USERNAME_LENGTH}
								maxLength={MAX_USERNAME_LENGTH}
								required
								{...errorInfo.username.fieldProps}
							/>
							{errorInfo.username.errorUI}
						</div>
					</div>

					<div>
						<label
							htmlFor="name"
							className="block text-sm font-medium text-gray-700"
						>
							Name
						</label>
						<div className="mt-1">
							<input
								id="name"
								name="name"
								autoComplete="name"
								className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
								minLength={MIN_NAME_LENGTH}
								maxLength={MAX_NAME_LENGTH}
								required
								{...errorInfo.name.fieldProps}
							/>
							{errorInfo.name.errorUI}
						</div>
					</div>

					<div>
						<label
							htmlFor="password"
							className="block text-sm font-medium text-gray-700"
						>
							Password
						</label>
						<div className="mt-1">
							<input
								id="password"
								className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
								autoComplete="new-password"
								type="password"
								name="password"
								minLength={MIN_PASSWORD_LENGTH}
								maxLength={MAX_PASSWORD_LENGTH}
								required
								{...errorInfo.password.fieldProps}
							/>
							{errorInfo.password.errorUI}
						</div>
					</div>

					<div>
						<label
							htmlFor="confirmPassword"
							className="block text-sm font-medium text-gray-700"
						>
							Confirm Password
						</label>
						<div className="mt-1">
							<input
								id="confirmPassword"
								autoComplete="new-password"
								className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
								type="password"
								name="confirmPassword"
								minLength={MIN_PASSWORD_LENGTH}
								maxLength={MAX_PASSWORD_LENGTH}
								required
								{...errorInfo.confirmPassword.fieldProps}
							/>
							{errorInfo.confirmPassword.errorUI}
						</div>
					</div>

					<div className="flex items-center">
						<input
							id="agreeToTermsOfServiceAndPrivacyPolicy"
							name="agreeToTermsOfServiceAndPrivacyPolicy"
							type="checkbox"
							className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
							required
							{...errorInfo.agreeToTermsOfServiceAndPrivacyPolicy.fieldProps}
						/>
						<label
							htmlFor="agreeToTermsOfServiceAndPrivacyPolicy"
							className="ml-2 block text-sm text-gray-900"
						>
							Do you agree to our Terms of Service and Privacy Policy?
						</label>
						{errorInfo.agreeToTermsOfServiceAndPrivacyPolicy.errorUI}
					</div>

					<div className="flex items-center">
						<input
							id="agreeToMailingList"
							name="agreeToMailingList"
							type="checkbox"
							className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
						/>
						<label
							htmlFor="agreeToMailingList"
							className="ml-2 block text-sm text-gray-900"
						>
							Would you like to receive special discounts and offers?
						</label>
					</div>

					<div className="flex items-center">
						<input
							id="remember"
							name="remember"
							type="checkbox"
							className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
						/>
						<label
							htmlFor="remember"
							className="ml-2 block text-sm text-gray-900"
						>
							Remember me
						</label>
					</div>

					<input type="hidden" name="redirectTo" value={redirectTo} />
					{data.formError ? (
						<div className="pt-1 text-red-700" id="form-error">
							{data.formError}
						</div>
					) : null}
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

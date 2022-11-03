import type { ActionArgs, LoaderArgs, MetaFunction } from '@remix-run/node'
import { redirect } from '@remix-run/node'
import { json } from '@remix-run/node'
import { useFetcher } from '@remix-run/react'
import invariant from 'tiny-invariant'
import { getUserByEmail } from '~/models/user.server'
import { sendEmail } from '~/services/email.server'
import { decrypt, encrypt } from '~/services/encryption.server'
import { commitSession, getSession } from '~/services/session.server'
import { getDomainUrl } from '~/utils/misc.server'

export const onboardingEmailSessionKey = 'onboardingToken'
const onboardingTokenQueryParam = 'token'
const tokenType = 'onboarding'

export async function loader({ request }: LoaderArgs) {
	const onboardingTokenString = new URL(request.url).searchParams.get(
		onboardingTokenQueryParam,
	)
	if (onboardingTokenString) {
		const token = JSON.parse(decrypt(onboardingTokenString))
		if (token.type === tokenType && token.payload?.email) {
			const session = await getSession(request.headers.get('cookie'))
			session.set(onboardingEmailSessionKey, token.payload.email)
			return redirect('/onboarding', {
				headers: {
					'Set-Cookie': await commitSession(session),
				},
			})
		} else {
			return redirect('/signup')
		}
	}
	return json({})
}

export async function action({ request }: ActionArgs) {
	const formData = await request.formData()
	const { email } = Object.fromEntries(formData)
	invariant(typeof email === 'string', 'email type invalid')

	const isEmailValid = /\S+@\S+\.\S+/.test(email)
	if (!isEmailValid) {
		return json(
			{ success: false, errors: { email: 'Invalid email', form: null } },
			{ status: 400 },
		)
	}

	const userExists = await getUserByEmail(email)
	if (userExists) {
		return json(
			{
				success: false,
				errors: { email: 'User with this email already exists', form: null },
			},
			{ status: 400 },
		)
	}

	const onboardingToken = encrypt(
		JSON.stringify({ type: tokenType, payload: { email } }),
	)
	const onboardingUrl = new URL(`${getDomainUrl(request)}/signup`)
	onboardingUrl.searchParams.set(onboardingTokenQueryParam, onboardingToken)

	const response = await sendEmail({
		to: email,
		subject: `Welcome to Rocket Rental!`,
		text: `Please open this URL: ${onboardingUrl}`,
		html: `
		<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
		<html>
			<head>
				<meta http-equiv="Content-Type" content="text/html charset=UTF-8" />
			</head>
			<body>
				<h1>Welcome to Rocket Rental!</h1>
				<p>Click the link below to get started:</p>
				<a href="${onboardingUrl}">${onboardingUrl}</a>
			</body>
		`,
	})

	if (response.ok) {
		return json({ success: true, errors: null })
	} else {
		return json({
			success: false,
			errors: { form: 'Email not sent successfully', email: null },
		})
	}
}

export const meta: MetaFunction = () => {
	return {
		title: 'Signup for Rocket Rental',
	}
}

export default function SignupRoute() {
	const signupFetcher = useFetcher<typeof action>()
	const hasEmailError = signupFetcher.data?.errors?.email

	return (
		<div>
			<h1>Signup</h1>
			<signupFetcher.Form
				method="post"
				noValidate
				aria-invalid={signupFetcher.data?.errors?.form ? true : undefined}
				aria-describedby={
					signupFetcher.data?.errors?.form ? 'form-error' : undefined
				}
			>
				<div>
					<label
						htmlFor="email"
						className="block text-sm font-medium text-gray-700"
					>
						Email
					</label>
					<div className="mt-1">
						<input
							id="email"
							type="email"
							name="email"
							className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
							aria-describedby={hasEmailError ? 'email-error' : undefined}
							aria-invalid={hasEmailError ? true : undefined}
						/>
						{hasEmailError ? (
							<span className="pt-1 text-red-700" id="email-error">
								{signupFetcher.data?.errors?.email}
							</span>
						) : null}
					</div>
				</div>
				{signupFetcher.data?.errors?.form ? (
					<div className="pt-1 text-red-700" id="form-error">
						{signupFetcher.data?.errors?.form}
					</div>
				) : null}
				<div>
					<button type="submit" disabled={signupFetcher.state !== 'idle'}>
						{signupFetcher.state === 'idle' ? 'Submit' : 'Submitting...'}
					</button>
				</div>
			</signupFetcher.Form>
			{signupFetcher.data?.success ? (
				<div>Great! Check your email for a link to continue.</div>
			) : null}
		</div>
	)
}

export function ErrorBoundary({ error }: { error: Error }) {
	console.error(error)

	return <div>An unexpected error occurred: {error.message}</div>
}

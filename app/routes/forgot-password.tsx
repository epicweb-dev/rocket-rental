import type { DataFunctionArgs, MetaFunction } from '@remix-run/node'
import { redirect } from '@remix-run/node'
import { json } from '@remix-run/node'
import { useFetcher } from '@remix-run/react'
import invariant from 'tiny-invariant'
import { prisma } from '~/db.server'
import { sendEmail } from '~/utils/email.server'
import { decrypt, encrypt } from '~/utils/encryption.server'
import { commitSession, getSession } from '~/utils/session.server'
import { getDomainUrl } from '~/utils/misc.server'

export const resetPasswordSessionKey = 'resetPasswordToken'
const resetPasswordTokenQueryParam = 'token'
const tokenType = 'forgot-password'

export async function loader({ request }: DataFunctionArgs) {
	const resetPasswordTokenString = new URL(request.url).searchParams.get(
		resetPasswordTokenQueryParam,
	)
	if (resetPasswordTokenString) {
		const token = JSON.parse(decrypt(resetPasswordTokenString))
		if (token.type === tokenType && token.payload?.username) {
			const session = await getSession(request.headers.get('cookie'))
			session.set(resetPasswordSessionKey, token.payload.username)
			return redirect('/reset-password', {
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

export async function action({ request }: DataFunctionArgs) {
	const formData = await request.formData()
	const { usernameOrEmail } = Object.fromEntries(formData)
	invariant(typeof usernameOrEmail === 'string', 'usernameOrEmail type invalid')
	// just a quick check to make sure they're not being ridiculous
	invariant(usernameOrEmail.length < 256, 'usernameOrEmail too long')

	const user = await prisma.user.findFirst({
		where: { OR: [{ email: usernameOrEmail }, { username: usernameOrEmail }] },
		select: { email: true, username: true },
	})
	if (!user) {
		return json(
			{
				status: 'error',
				errors: { usernameOrEmail: 'User not found', form: null },
			},
			{ status: 400 },
		)
	}

	const resetPasswordToken = encrypt(
		JSON.stringify({ type: tokenType, payload: { username: user.username } }),
	)
	const resetPasswordUrl = new URL(`${getDomainUrl(request)}/forgot-password`)
	resetPasswordUrl.searchParams.set(
		resetPasswordTokenQueryParam,
		resetPasswordToken,
	)

	const response = await sendEmail({
		to: user.email,
		subject: `Rocket Rental Password Reset`,
		text: `Please open this URL: ${resetPasswordUrl}`,
		html: `
		<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
		<html>
			<head>
				<meta http-equiv="Content-Type" content="text/html charset=UTF-8" />
			</head>
			<body>
				<h1>Reset your Rocket Rental password.</h1>
				<p>Click the link below to reset the rocket rental password for ${user.username}.</p>
				<a href="${resetPasswordUrl}">${resetPasswordUrl}</a>
			</body>
		`,
	})

	if (response.ok) {
		return json({ status: 'success', errors: null })
	} else {
		return json({
			status: 'error',
			errors: { form: 'Email not sent successfully', usernameOrEmail: null },
		})
	}
}

export const meta: MetaFunction = () => {
	return {
		title: 'Password Recovery for Rocket Rental',
	}
}

export default function SignupRoute() {
	const forgotPassword = useFetcher<typeof action>()
	const hasUsernameOrEmailError = forgotPassword.data?.errors?.usernameOrEmail

	return (
		<div>
			<h1>Forgot Password</h1>
			<forgotPassword.Form
				method="post"
				noValidate
				aria-invalid={forgotPassword.data?.errors?.form ? true : undefined}
				aria-describedby={
					forgotPassword.data?.errors?.form ? 'form-error' : undefined
				}
			>
				<div>
					<label
						htmlFor="usernameOrEmail"
						className="block text-sm font-medium text-gray-700"
					>
						Username or Email
					</label>
					<div className="mt-1">
						<input
							id="usernameOrEmail"
							name="usernameOrEmail"
							className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
							aria-describedby={
								hasUsernameOrEmailError ? 'username-or-email-error' : undefined
							}
							aria-invalid={hasUsernameOrEmailError ? true : undefined}
						/>
						{hasUsernameOrEmailError ? (
							<span className="pt-1 text-red-700" id="username-or-email-error">
								{forgotPassword.data?.errors?.usernameOrEmail}
							</span>
						) : null}
					</div>
				</div>
				{forgotPassword.data?.errors?.form ? (
					<div className="pt-1 text-red-700" id="form-error">
						{forgotPassword.data?.errors?.form}
					</div>
				) : null}
				<div>
					<button type="submit" disabled={forgotPassword.state !== 'idle'}>
						{forgotPassword.state === 'idle' ? 'Submit' : 'Submitting...'}
					</button>
				</div>
			</forgotPassword.Form>
			{forgotPassword.data?.status === 'success' ? (
				<div>Great! Check your email for a link to continue.</div>
			) : null}
		</div>
	)
}

export function ErrorBoundary({ error }: { error: Error }) {
	console.error(error)

	return <div>An unexpected error occurred: {error.message}</div>
}

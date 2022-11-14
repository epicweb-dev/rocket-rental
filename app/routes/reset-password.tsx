import type { DataFunctionArgs, MetaFunction } from '@remix-run/node'
import { redirect } from '@remix-run/node'
import { json } from '@remix-run/node'
import {
	Form,
	useActionData,
	useLoaderData,
	useTransition,
} from '@remix-run/react'
import { useEffect, useRef } from 'react'
import invariant from 'tiny-invariant'
import { resetUserPassword } from '~/models/user.server'
import {
	MAX_PASSWORD_LENGTH,
	MIN_PASSWORD_LENGTH,
	validateConfirmPassword,
	validatePassword,
} from '~/utils/user-validation'
import { authenticator } from '~/utils/auth.server'
import { commitSession, getSession } from '~/utils/session.server'
import { resetPasswordSessionKey } from './forgot-password'

export async function loader({ request }: DataFunctionArgs) {
	await authenticator.isAuthenticated(request, {
		successRedirect: '/',
	})
	const session = await getSession(request.headers.get('cookie'))
	const error = session.get(authenticator.sessionErrorKey)
	const resetPasswordUsername = session.get(resetPasswordSessionKey)
	if (typeof resetPasswordUsername !== 'string' || !resetPasswordUsername) {
		return redirect('/login')
	}
	return json(
		{ formError: error?.message, resetPasswordUsername },
		{
			headers: {
				'Set-Cookie': await commitSession(session),
			},
		},
	)
}

export async function action({ request }: DataFunctionArgs) {
	const formData = await request.formData()
	const { password, confirmPassword } = Object.fromEntries(formData)
	invariant(typeof password === 'string', 'password type invalid')
	invariant(typeof confirmPassword === 'string', 'confirmPassword type invalid')

	const errors = {
		password: validatePassword(password),
		confirmPassword: validateConfirmPassword({ password, confirmPassword }),
	}
	const hasErrors = Object.values(errors).some(Boolean)
	if (hasErrors) {
		return json({ errors }, { status: 400 })
	}

	const session = await getSession(request.headers.get('cookie'))
	const username = session.get(resetPasswordSessionKey)
	if (typeof username !== 'string' || !username) {
		return redirect('/login')
	}
	await resetUserPassword({ username, password })
	session.unset(resetPasswordSessionKey)
	return redirect('/login', {
		headers: { 'Set-Cookie': await commitSession(session) },
	})
}

export const meta: MetaFunction = () => {
	return {
		title: 'Setup Rocket Rental Account',
	}
}

export default function ResetPasswordPage() {
	const data = useLoaderData<typeof loader>()
	const form = useRef<HTMLFormElement>(null)
	const transition = useTransition()
	const actionData = useActionData<typeof action>()

	const hasPasswordError = actionData?.errors?.password
	const hasConfirmPasswordError = actionData?.errors?.confirmPassword
	const hasErrors = hasConfirmPasswordError || hasPasswordError

	useEffect(() => {
		if (!form.current) return
		if (hasErrors) {
			const firstInvalidElement = form.current.querySelector('[aria-invalid]')
			if (firstInvalidElement instanceof HTMLElement) {
				firstInvalidElement.focus()
			}
		}
	}, [hasErrors])

	return (
		<div className="flex min-h-full flex-col justify-center">
			<div className="mx-auto w-full max-w-md px-8">
				<Form
					method="post"
					className="space-y-6"
					aria-invalid={data.formError ? true : undefined}
					aria-describedby="form-error"
					ref={form}
					noValidate
				>
					<div>Resetting password for {data.resetPasswordUsername}</div>

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
								type="password"
								name="password"
								required
								minLength={MIN_PASSWORD_LENGTH}
								maxLength={MAX_PASSWORD_LENGTH}
								autoComplete="current-password"
								className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
								aria-describedby={
									hasPasswordError ? 'password-error' : undefined
								}
								aria-invalid={hasPasswordError ? true : undefined}
							/>
							{hasPasswordError ? (
								<span className="pt-1 text-red-700" id="password-error">
									{actionData?.errors.password}
								</span>
							) : null}
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
								type="password"
								name="confirmPassword"
								required
								minLength={MIN_PASSWORD_LENGTH}
								maxLength={MAX_PASSWORD_LENGTH}
								autoComplete="current-password"
								className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
								aria-describedby={
									hasConfirmPasswordError ? 'confirm-password-error' : undefined
								}
								aria-invalid={hasConfirmPasswordError ? true : undefined}
							/>
							{hasConfirmPasswordError ? (
								<span className="pt-1 text-red-700" id="confirm-password-error">
									{actionData?.errors.confirmPassword}
								</span>
							) : null}
						</div>
					</div>

					{data.formError ? (
						<div className="pt-1 text-red-700" id="form-error">
							{data.formError}
						</div>
					) : null}
					<div className="flex items-center justify-between gap-6">
						<button
							type="submit"
							className="w-full rounded bg-gray-500  py-2 px-4 text-white hover:bg-gray-600 focus:bg-gray-400"
							disabled={Boolean(transition.submission)}
						>
							{transition.submission ? 'Resetting...' : 'Reset Password'}
						</button>
					</div>
				</Form>
			</div>
		</div>
	)
}

export function ErrorBoundary({ error }: { error: Error }) {
	console.error(error)

	return <div>An unexpected error occurred: {error.message}</div>
}

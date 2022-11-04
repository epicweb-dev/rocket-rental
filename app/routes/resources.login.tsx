import type { ActionArgs } from '@remix-run/node'
import { json } from '@remix-run/node'
import { Link, useFetcher } from '@remix-run/react'
import { useEffect, useRef } from 'react'
import { FormStrategy } from 'remix-auth-form'
import invariant from 'tiny-invariant'
import {
	MAX_PASSWORD_LENGTH,
	MAX_USERNAME_LENGTH,
	MIN_PASSWORD_LENGTH,
	MIN_USERNAME_LENGTH,
	validatePassword,
	validateUsername,
} from '~/models/user.server'
import { authenticator } from '~/services/auth.server'
import { commitSession, getSession } from '~/services/session.server'

export async function action({ request }: ActionArgs) {
	const formData = await request.clone().formData()
	const { username, password, redirectTo, remember } =
		Object.fromEntries(formData)
	invariant(typeof username === 'string', 'username type invalid')
	invariant(typeof password === 'string', 'password type invalid')
	invariant(typeof redirectTo === 'string', 'redirectTo type invalid')

	const errors = {
		username: validateUsername(username),
		password: validatePassword(password),
		form: null,
	}
	const hasErrors = Object.values(errors).some(Boolean)
	if (hasErrors) {
		return json({ status: 'error', errors }, { status: 400 })
	}

	const userId = await authenticator.authenticate(FormStrategy.name, request)
	if (!userId) {
		return json(
			{
				status: 'auth-error',
				errors: {
					username: null,
					password: null,
					form: 'Invalid username or password',
				},
			},
			{ status: 400 },
		)
	}
	const session = await getSession(request.headers.get('cookie'))
	session.set(authenticator.sessionKey, userId)
	const newCookie = await commitSession(session, {
		maxAge: remember
			? 60 * 60 * 24 * 7 // 7 days
			: undefined,
	})
	return json(
		{ status: 'success', errors: null },
		{
			headers: { 'Set-Cookie': newCookie },
		},
	)
}

export function InlineLogin() {
	const loginFetcher = useFetcher<typeof action>()
	const form = useRef<HTMLFormElement>(null)
	const hasUsernameError = loginFetcher.data?.errors?.username
	const hasPasswordError = loginFetcher.data?.errors?.password
	const hasErrors = hasUsernameError || hasPasswordError

	useEffect(() => {
		if (!form.current) return
		if (hasErrors) {
			const firstInvalidElement = form.current.querySelector('[aria-invalid]')
			if (firstInvalidElement instanceof HTMLElement) {
				firstInvalidElement.focus()
			}
		}
	}, [hasErrors])

	const formError = loginFetcher.data?.errors?.form

	return (
		<div>
			<div className="mx-auto w-full max-w-md px-8">
				<loginFetcher.Form
					method="post"
					action="/resources/login"
					className="space-y-6"
					aria-invalid={formError ? true : undefined}
					aria-describedby="form-error"
					ref={form}
					noValidate
				>
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
								type="text"
								name="username"
								required
								minLength={MIN_USERNAME_LENGTH}
								maxLength={MAX_USERNAME_LENGTH}
								autoComplete="username"
								className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
								aria-describedby={
									hasUsernameError ? 'username-error' : undefined
								}
								aria-invalid={hasUsernameError ? true : undefined}
							/>
							{hasUsernameError ? (
								<span className="pt-1 text-red-700" id="username-error">
									{loginFetcher.data?.errors?.username}
								</span>
							) : null}
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
									{loginFetcher.data?.errors?.password}
								</span>
							) : null}
						</div>
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

					{formError ? (
						<div className="pt-1 text-red-700" id="form-error">
							{formError}
						</div>
					) : null}
					<div className="flex items-center justify-between gap-6">
						<button
							type="submit"
							className="w-full rounded bg-blue-500  py-2 px-4 text-white hover:bg-blue-600 focus:bg-blue-400"
						>
							Log in
						</button>
					</div>
				</loginFetcher.Form>
				<div className="flex justify-around pt-6">
					<Link to="/signup" className="text-blue-600 underline">
						New here?
					</Link>
					<Link to="/forgot-password" className="text-blue-600 underline">
						Forgot password?
					</Link>
				</div>
			</div>
		</div>
	)
}

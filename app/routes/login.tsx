import type { ActionArgs, LoaderArgs, MetaFunction } from '@remix-run/node'
import { json, redirect } from '@remix-run/node'
import { Form, useActionData, useSearchParams } from '@remix-run/react'
import * as React from 'react'

import { createUserSession, getUserId } from '~/session.server'
import { createUser, getUserByEmail, verifyLogin } from '~/models/user.server'
import { safeRedirect, validateEmail } from '~/utils'

export async function loader({ request }: LoaderArgs) {
	const userId = await getUserId(request)
	if (userId) return redirect('/')
	return json({})
}

export async function action({ request }: ActionArgs) {
	const formData = await request.formData()
	const email = formData.get('email')
	const password = formData.get('password')
	const redirectTo = safeRedirect(formData.get('redirectTo'), '/')
	const remember = formData.get('remember')

	if (!validateEmail(email)) {
		return json({ errors: { email: 'Email is invalid' } }, { status: 400 })
	}

	if (typeof password !== 'string' || password.length === 0) {
		return json(
			{ errors: { password: 'Password is required' } },
			{ status: 400 },
		)
	}

	if (password.length < 8) {
		return json(
			{ errors: { password: 'Password is too short' } },
			{ status: 400 },
		)
	}

	const intent = formData.get('intent')
	let userId: string
	switch (intent) {
		case 'login': {
			const user = await verifyLogin(email, password)

			if (!user) {
				return json(
					{ errors: { email: 'Invalid email or password' } },
					{ status: 400 },
				)
			}
			userId = user.id
			break
		}
		case 'signup': {
			const existingUser = await getUserByEmail(email)
			if (existingUser) {
				return json(
					{ errors: { email: 'A user already exists with this email' } },
					{ status: 400 },
				)
			}

			const user = await createUser(email, password)
			userId = user.id

			break
		}
		default: {
			return json({ errors: { email: 'Invalid intent' } }, { status: 400 })
		}
	}

	return createUserSession({
		request,
		userId,
		remember: remember === 'on' ? true : false,
		redirectTo,
	})
}

export const meta: MetaFunction = () => {
	return {
		title: 'Login',
	}
}

export default function LoginPage() {
	const [searchParams] = useSearchParams()
	const redirectTo = searchParams.get('redirectTo') || '/'
	const actionData = useActionData<typeof action>()
	const emailRef = React.useRef<HTMLInputElement>(null)
	const passwordRef = React.useRef<HTMLInputElement>(null)
	let emailError: string | null = null
	let passwordError: string | null = null
	if (actionData && actionData.errors) {
		const { errors } = actionData
		emailError = 'email' in errors ? errors.email : null
		passwordError = 'password' in errors ? errors.password : null
	}

	React.useEffect(() => {
		if (emailError) {
			emailRef.current?.focus()
		} else if (passwordError) {
			passwordRef.current?.focus()
		}
	}, [emailError, passwordError])

	return (
		<div className="flex min-h-full flex-col justify-center">
			<div className="mx-auto w-full max-w-md px-8">
				<Form method="post" className="space-y-6">
					<div>
						<label
							htmlFor="email"
							className="block text-sm font-medium text-gray-700"
						>
							Email address
						</label>
						<div className="mt-1">
							<input
								ref={emailRef}
								id="email"
								required
								autoFocus={true}
								name="email"
								type="email"
								autoComplete="email"
								aria-invalid={emailError ? true : undefined}
								aria-describedby="email-error"
								className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
							/>

							{emailError && (
								<div className="pt-1 text-red-700" id="email-error">
									{emailError}
								</div>
							)}
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
								ref={passwordRef}
								name="password"
								type="password"
								autoComplete="current-password"
								aria-invalid={passwordError ? true : undefined}
								aria-describedby="password-error"
								className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
							/>
							{passwordError && (
								<div className="pt-1 text-red-700" id="password-error">
									{passwordError}
								</div>
							)}
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

					<input type="hidden" name="redirectTo" value={redirectTo} />
					<div className="flex items-center justify-between gap-6">
						<button
							type="submit"
							name="intent"
							value="login"
							className="w-full rounded bg-blue-500  py-2 px-4 text-white hover:bg-blue-600 focus:bg-blue-400"
						>
							Log in
						</button>
						<button
							type="submit"
							name="intent"
							value="signup"
							className="w-full rounded bg-gray-500  py-2 px-4 text-white hover:bg-gray-600 focus:bg-gray-400"
						>
							Sign up
						</button>
					</div>
				</Form>
			</div>
		</div>
	)
}

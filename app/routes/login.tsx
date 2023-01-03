import type { DataFunctionArgs, V2_MetaFunction } from '@remix-run/node'
import { redirect, json } from '@remix-run/node'
import {
	Form,
	Link,
	useActionData,
	useLoaderData,
	useSearchParams,
} from '@remix-run/react'
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
} from '~/utils/user-validation'
import { authenticator } from '~/utils/auth.server'
import { commitSession, getSession } from '~/utils/session.server'
import { safeRedirect } from '~/utils/misc'

export async function loader({ request }: DataFunctionArgs) {
	await authenticator.isAuthenticated(request, {
		successRedirect: '/',
	})
	const session = await getSession(request.headers.get('cookie'))
	const error = session.get(authenticator.sessionErrorKey)
	return json(
		{ formError: error?.message },
		{
			headers: {
				'Set-Cookie': await commitSession(session),
			},
		},
	)
}

export async function action({ request }: DataFunctionArgs) {
	const formData = await request.clone().formData()
	const { username, password, redirectTo, remember } =
		Object.fromEntries(formData)
	invariant(typeof username === 'string', 'username type invalid')
	invariant(typeof password === 'string', 'password type invalid')
	invariant(typeof redirectTo === 'string', 'redirectTo type invalid')

	const errors = {
		username: validateUsername(username),
		password: validatePassword(password),
	}
	const hasErrors = Object.values(errors).some(Boolean)
	if (hasErrors) {
		return json({ errors }, { status: 400 })
	}

	const userId = await authenticator.authenticate(FormStrategy.name, request, {
		failureRedirect: '/login',
	})
	const session = await getSession(request.headers.get('cookie'))
	session.set(authenticator.sessionKey, userId)
	const newCookie = await commitSession(session, {
		maxAge: remember
			? 60 * 60 * 24 * 7 // 7 days
			: undefined,
	})
	return redirect(safeRedirect(redirectTo), {
		headers: { 'Set-Cookie': newCookie },
	})
}

export const meta: V2_MetaFunction = ({ matches }) => {
	let rootModule = matches.find(match => match.route.id === 'root')

	return [
		...(rootModule?.meta ?? [])?.filter(meta => !('title' in meta)),
		{ tite: 'Login to Rocket Rental' },
	]
}

export default function LoginPage() {
	const [searchParams] = useSearchParams()
	const form = useRef<HTMLFormElement>(null)
	const data = useLoaderData<typeof loader>()
	const redirectTo = searchParams.get('redirectTo') || '/'
	const actionData = useActionData<typeof action>()
	const hasUsernameError = actionData?.errors?.username
	const hasPasswordError = actionData?.errors?.password
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

	return (
		<div className="flex min-h-full flex-col justify-center">
			<div className="mx-auto w-full max-w-md px-8">
				<Form
					method="post"
					className="space-y-6"
					aria-invalid={data.formError ? true : undefined}
					aria-describedby={data.formError ? 'form-error' : undefined}
					noValidate
					ref={form}
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
								name="username"
								autoFocus={true}
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
									{actionData?.errors.username}
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
									{actionData?.errors.password}
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

					<input type="hidden" name="redirectTo" value={redirectTo} />
					{data.formError ? (
						<div className="pt-1 text-red-700" id="form-error">
							{data.formError}
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
				</Form>
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

export function ErrorBoundary({ error }: { error: Error }) {
	console.error(error)

	return <div>An unexpected error occurred: {error.message}</div>
}

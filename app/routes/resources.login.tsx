import type { ActionArgs } from '@remix-run/node'
import { json } from '@remix-run/node'
import { Link, useFetcher } from '@remix-run/react'
import { FormStrategy } from 'remix-auth-form'
import { FormContextProvider } from 'remix-validity-state'
import { useValidatedInput } from 'remix-validity-state'
import { validateServerFormData } from 'remix-validity-state'
import { ListOfErrorMessages } from '~/components'
import { authenticator } from '~/services/auth.server'
import { commitSession, getSession } from '~/services/session.server'
import { formValidations, errorMessages } from '~/utils/login'

export async function action({ request }: ActionArgs) {
	const formData = await request.clone().formData()
	const serverFormInfo = await validateServerFormData(formData, formValidations)
	if (!serverFormInfo.valid) {
		return json({ status: 'form-error', serverFormInfo }, { status: 400 })
	}
	const remember = formData.get('remember') === 'on'

	const userId = await authenticator.authenticate(FormStrategy.name, request)
	if (!userId) {
		return json({ status: 'auth-error' }, { status: 400 })
	}
	const session = await getSession(request.headers.get('cookie'))
	session.set(authenticator.sessionKey, userId)
	const newCookie = await commitSession(session, {
		maxAge: remember
			? 60 * 60 * 24 * 7 // 7 days
			: undefined,
	})
	return json(
		{ status: 'success' },
		{
			headers: { 'Set-Cookie': newCookie },
		},
	)
}

// TODO: remove the wrapper thing when this is fixed: https://github.com/brophdawg11/remix-validity-state/issues/14
export function InlineLogin() {
	return (
		<FormContextProvider value={{ formValidations, errorMessages }}>
			<InlineLoginImpl />
		</FormContextProvider>
	)
}

function InlineLoginImpl() {
	const loginFetcher = useFetcher()
	const usernameField = useValidatedInput({
		name: 'username',
		formValidations,
		errorMessages,
		serverFormInfo: loginFetcher.data?.serverFormInfo,
	})
	const passwordField = useValidatedInput({
		name: 'password',
		formValidations,
		errorMessages,
		serverFormInfo: loginFetcher.data?.serverFormInfo,
	})
	const formError =
		loginFetcher.data?.status === 'auth-error'
			? 'Invalid username or password'
			: null

	return (
		<div>
			<div className="mx-auto w-full max-w-md px-8">
				<loginFetcher.Form
					method="post"
					action="/resources/login"
					className="space-y-6"
					aria-invalid={formError ? true : undefined}
					aria-describedby="form-error"
				>
					<div>
						<label
							{...usernameField.getLabelAttrs({
								className: 'block text-sm font-medium text-gray-700',
							})}
						>
							Username
						</label>
						<div className="mt-1">
							<input
								{...usernameField.getInputAttrs({
									autoFocus: true,
									autoComplete: 'username',
									className:
										'w-full rounded border border-gray-500 px-2 py-1 text-lg',
								})}
							/>

							<ListOfErrorMessages info={usernameField.info} />
						</div>
					</div>

					<div>
						<label
							{...passwordField.getLabelAttrs({
								className: 'block text-sm font-medium text-gray-700',
							})}
						>
							Password
						</label>
						<div className="mt-1">
							<input
								{...passwordField.getInputAttrs({
									autoComplete: 'current-password',
									className:
										'w-full rounded border border-gray-500 px-2 py-1 text-lg',
								})}
							/>

							<ListOfErrorMessages info={passwordField.info} />
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

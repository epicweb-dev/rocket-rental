import type { ActionArgs, LoaderArgs, MetaFunction } from '@remix-run/node'
import { redirect } from '@remix-run/node'
import { json } from '@remix-run/node'
import {
	Form,
	useActionData,
	useLoaderData,
	useTransition,
} from '@remix-run/react'
import type { FormValidations, ErrorMessages } from 'remix-validity-state'
import { FormContextProvider } from 'remix-validity-state'
import { useValidatedInput } from 'remix-validity-state'
import { validateServerFormData } from 'remix-validity-state'
import { ListOfErrorMessages } from '~/components'
import { resetUserPassword } from '~/models/user.server'
import { authenticator } from '~/services/auth.server'
import { commitSession, getSession } from '~/services/session.server'
import { constrain } from '~/utils/misc'
import { resetPasswordSessionKey } from './forgot-password'

export async function loader({ request }: LoaderArgs) {
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

const formValidations = constrain<FormValidations>()({
	password: {
		type: 'password',
		required: true,
		minLength: 6,
		maxLength: 100,
	},
	confirmPassword: {
		type: 'password',
		required: true,
		minLength: 6,
		maxLength: 100,
	},
})

const errorMessages = constrain<ErrorMessages>()({
	valueMissing: (_, name) => `The ${name} field is required`,
	tooShort: (minLength, name) =>
		`The ${name} field must be at least ${minLength} characters`,
	tooLong: (maxLength, name) =>
		`The ${name} field must be less than ${maxLength} characters`,
	matchField: (_, name) =>
		name === 'confirmPassword' ? `Must match password` : `Must match`,
})

export async function action({ request }: ActionArgs) {
	const formData = await request.formData()
	const serverFormInfo = await validateServerFormData(formData, {
		...formValidations,
		confirmPassword: {
			...formValidations.confirmPassword,
			matchField: async value => {
				return value === formData.get('password')
			},
		},
	})

	if (!serverFormInfo.valid) {
		return json({ serverFormInfo }, { status: 400 })
	}
	const session = await getSession(request.headers.get('cookie'))
	const username = session.get(resetPasswordSessionKey)
	if (typeof username !== 'string' || !username) {
		return redirect('/login')
	}

	const { password } = serverFormInfo.submittedFormData

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

export default function TempResetPasswordParent() {
	return (
		<FormContextProvider value={{ formValidations, errorMessages }}>
			<ResetPasswordPage />
		</FormContextProvider>
	)
}

function ResetPasswordPage() {
	const data = useLoaderData<typeof loader>()
	const transition = useTransition()
	const actionData = useActionData<typeof action>()
	const passwordField = useValidatedInput({
		name: 'password',
		formValidations,
		errorMessages,
		serverFormInfo: actionData?.serverFormInfo,
	})
	const confirmPasswordField = useValidatedInput({
		name: 'confirmPassword',
		formValidations,
		errorMessages,
		serverFormInfo: actionData?.serverFormInfo,
	})

	return (
		<div className="flex min-h-full flex-col justify-center">
			<div className="mx-auto w-full max-w-md px-8">
				<Form
					method="post"
					className="space-y-6"
					aria-invalid={data.formError ? true : undefined}
					aria-describedby="form-error"
				>
					<div>Resetting password for {data.resetPasswordUsername}</div>

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
									autoComplete: 'new-password',
									className:
										'w-full rounded border border-gray-500 px-2 py-1 text-lg',
								})}
							/>

							<ListOfErrorMessages
								info={passwordField.info}
								{...passwordField.getErrorsAttrs({ className: '' })}
							/>
						</div>
					</div>

					<div>
						<label
							{...confirmPasswordField.getLabelAttrs({
								className: 'block text-sm font-medium text-gray-700',
							})}
						>
							Confirm Password
						</label>
						<div className="mt-1">
							<input
								{...confirmPasswordField.getInputAttrs({
									autoComplete: 'current-password',
									className:
										'w-full rounded border border-gray-500 px-2 py-1 text-lg',
								})}
							/>

							<ListOfErrorMessages
								info={confirmPasswordField.info}
								{...confirmPasswordField.getErrorsAttrs({ className: '' })}
							/>
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

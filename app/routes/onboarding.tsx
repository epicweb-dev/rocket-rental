import type { ActionArgs, LoaderArgs, MetaFunction } from '@remix-run/node'
import { redirect } from '@remix-run/node'
import { json } from '@remix-run/node'
import {
	Form,
	Link,
	useActionData,
	useLoaderData,
	useSearchParams,
} from '@remix-run/react'
import type { FormValidations, ErrorMessages } from 'remix-validity-state'
import { FormContextProvider } from 'remix-validity-state'
import { useValidatedInput } from 'remix-validity-state'
import { validateServerFormData } from 'remix-validity-state'
import { ListOfErrorMessages } from '~/components'
import { createUser, getUserByUsername } from '~/models/user.server'
import { authenticator } from '~/services/auth.server'
import { commitSession, getSession } from '~/services/session.server'
import { constrain, safeRedirect } from '~/utils/misc'
import { onboardingEmailSessionKey } from './signup'

export async function loader({ request }: LoaderArgs) {
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

const formValidations = constrain<FormValidations>()({
	username: {
		required: true,
		minLength: 2,
		maxLength: 15,
	},
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
	name: {
		required: true,
		minLength: 1,
		maxLength: 40,
	},
	// TODO: add these when remix-validity-state supports checkboxes
	agreeToTermsOfServiceAndPrivacyPolicy: {
		type: 'checkbox',
		required: true,
	},
	agreeToMailingList: {
		type: 'checkbox',
	},
	remember: {
		type: 'checkbox',
	},
	redirectTo: {},
})

const errorMessages = constrain<ErrorMessages>()({
	valueMissing: (_, name) => `The ${name} field is required`,
	typeMismatch: (_, name) => `The ${name} field is invalid`,
	tooShort: (minLength, name) =>
		`The ${name} field must be at least ${minLength} characters`,
	tooLong: (maxLength, name) =>
		`The ${name} field must be less than ${maxLength} characters`,
	unique: (_, name, value) => `The ${name} "${value}" is already in use`,
	matchField: (_, name) =>
		name === 'confirmPassword' ? `Must match password` : `Must match`,
})

export async function action({ request }: ActionArgs) {
	const formData = await request.formData()
	const serverFormInfo = await validateServerFormData(formData, {
		...formValidations,
		username: {
			...formValidations.username,
			unique: async value => {
				const user = await getUserByUsername(value)
				return !user
			},
		},
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
	const email = session.get(onboardingEmailSessionKey)
	if (typeof email !== 'string' || !email) {
		return redirect('/signup')
	}

	const { username, password, name, redirectTo } =
		serverFormInfo.submittedFormData

	const remember = formData.get('remember')

	const user = await createUser({ email, username, password, name })
	session.set(authenticator.sessionKey, user.id)
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

export default function TempOnboardingParent() {
	return (
		<FormContextProvider value={{ formValidations, errorMessages }}>
			<OnboardingPage />
		</FormContextProvider>
	)
}

function OnboardingPage() {
	const [searchParams] = useSearchParams()
	const data = useLoaderData<typeof loader>()
	const actionData = useActionData<typeof action>()
	const redirectTo = searchParams.get('redirectTo') || '/'
	const usernameField = useValidatedInput({
		name: 'username',
		formValidations,
		errorMessages,
		serverFormInfo: actionData?.serverFormInfo,
	})
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
	const nameField = useValidatedInput({
		name: 'name',
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
					<div>Onboarding for {data.onboardingEmail}</div>
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

							<ListOfErrorMessages
								info={usernameField.info}
								{...usernameField.getErrorsAttrs({ className: '' })}
							/>
						</div>
					</div>

					<div>
						<label
							{...nameField.getLabelAttrs({
								className: 'block text-sm font-medium text-gray-700',
							})}
						>
							Name
						</label>
						<div className="mt-1">
							<input
								{...nameField.getInputAttrs({
									className:
										'w-full rounded border border-gray-500 px-2 py-1 text-lg',
								})}
							/>

							<ListOfErrorMessages
								info={nameField.info}
								{...nameField.getErrorsAttrs({ className: '' })}
							/>
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

					<div className="flex items-center">
						<input
							id="agreeToTermsOfServiceAndPrivacyPolicy"
							name="agreeToTermsOfServiceAndPrivacyPolicy"
							type="checkbox"
							className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
						/>
						<label
							htmlFor="agreeToTermsOfServiceAndPrivacyPolicy"
							className="ml-2 block text-sm text-gray-900"
						>
							Do you agree to our Terms of Service and Privacy Policy?
						</label>
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

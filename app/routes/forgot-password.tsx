import type { ActionArgs, LoaderArgs, MetaFunction } from '@remix-run/node'
import { redirect } from '@remix-run/node'
import { json } from '@remix-run/node'
import { useActionData, useFetcher } from '@remix-run/react'
import type { ErrorMessages, FormValidations } from 'remix-validity-state'
import {
	FormContextProvider,
	useValidatedInput,
	validateServerFormData,
} from 'remix-validity-state'
import invariant from 'tiny-invariant'
import { ListOfErrorMessages } from '~/components'
import { getUserByUsername } from '~/models/user.server'
import { sendEmail } from '~/services/email.server'
import { decrypt, encrypt } from '~/services/encryption.server'
import { commitSession, getSession } from '~/services/session.server'
import { constrain } from '~/utils/misc'
import { getDomainUrl } from '~/utils/misc.server'

export const resetPasswordSessionKey = 'resetPasswordToken'
const resetPasswordTokenQueryParam = 'token'
const tokenType = 'forgot-password'

export async function loader({ request }: LoaderArgs) {
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

const formValidations = constrain<FormValidations>()({
	username: {
		required: true,
		minLength: 2,
		maxLength: 15,
	},
})

const errorMessages = constrain<ErrorMessages>()({
	valueMissing: (_, name) => `The ${name} field is required`,
	typeMismatch: (_, name) => `The ${name} field is invalid`,
	tooShort: (minLength, name) =>
		`The ${name} field must be at least ${minLength} characters`,
	tooLong: (maxLength, name) =>
		`The ${name} field must be less than ${maxLength} characters`,
	exists: (_, __, username) =>
		`No user with the username of "${username}" exists`,
})

export const meta: MetaFunction = () => {
	return {
		title: 'Forgot Rocket Rental password',
	}
}

export default function TempForgotPasswordParent() {
	return (
		<FormContextProvider value={{ formValidations, errorMessages }}>
			<ForgotPasswordRoute />
		</FormContextProvider>
	)
}

export async function action({ request }: ActionArgs) {
	const formData = await request.formData()
	const serverFormInfo = await validateServerFormData(formData, {
		...formValidations,
		username: {
			...formValidations.username,
			exists: async value => {
				const user = await getUserByUsername(value)
				return Boolean(user)
			},
		},
	})

	if (!serverFormInfo.valid) {
		console.log(serverFormInfo)
		return json({ success: false, serverFormInfo }, { status: 400 })
	}

	const { username } = serverFormInfo.submittedFormData
	const resetPasswordToken = encrypt(
		JSON.stringify({ type: tokenType, payload: { username } }),
	)
	const resetPasswordUrl = new URL(`${getDomainUrl(request)}/forgot-password`)
	resetPasswordUrl.searchParams.set(
		resetPasswordTokenQueryParam,
		resetPasswordToken,
	)

	const user = await getUserByUsername(username)
	invariant(user, 'User should exist')

	const response = await sendEmail({
		to: user.email,
		subject: `Welcome to Rocket Rental!`,
		text: `Please open this URL: ${resetPasswordUrl}`,
		html: `
		<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
		<html>
			<head>
				<meta http-equiv="Content-Type" content="text/html charset=UTF-8" />
			</head>
			<body>
				<h1>Reset your Rocket Rental password.</h1>
				<p>Click the link below to reset the rocket rental password for ${username}.</p>
				<a href="${resetPasswordUrl}">${resetPasswordUrl}</a>
			</body>
		`,
	})

	return json({ success: response.ok, serverFormInfo })
}

function ForgotPasswordRoute() {
	const fetcher = useFetcher()
	const actionData = useActionData<typeof action>()

	const usernameField = useValidatedInput({
		name: 'username',
		formValidations,
		errorMessages,
		serverFormInfo: actionData?.serverFormInfo,
	})

	return (
		<div>
			<h1>Forgot Password</h1>
			<fetcher.Form method="post">
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
					<button type="submit" disabled={fetcher.state !== 'idle'}>
						{fetcher.state === 'idle' ? 'Submit' : 'Submitting...'}
					</button>
				</div>
			</fetcher.Form>
		</div>
	)
}

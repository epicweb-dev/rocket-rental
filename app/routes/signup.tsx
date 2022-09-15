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
import { ListOfErrorMessages } from '~/components'
import { getUserByEmail } from '~/models/user.server'
import { decrypt, encrypt } from '~/services/encryption.server'
import { commitSession, getSession } from '~/services/session.server'
import { constrain } from '~/utils/misc'
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

const formValidations = constrain<FormValidations>()({
	email: {
		type: 'email',
		required: true,
		minLength: 3,
		maxLength: 50,
	},
})

const errorMessages = constrain<ErrorMessages>()({
	valueMissing: (_, name) => `The ${name} field is required`,
	typeMismatch: (_, name) => `The ${name} field is invalid`,
	tooShort: (minLength, name) =>
		`The ${name} field must be at least ${minLength} characters`,
	tooLong: (maxLength, name) =>
		`The ${name} field must be less than ${maxLength} characters`,
	unique: (_, name, value) => `The ${name} "${value}" is already in use`,
})

export async function action({ request }: ActionArgs) {
	const formData = await request.formData()
	const serverFormInfo = await validateServerFormData(formData, {
		...formValidations,
		email: {
			...formValidations.email,
			unique: async value => {
				const user = await getUserByEmail(value)
				return !user
			},
		},
	})

	if (!serverFormInfo.valid) {
		return json({ success: false, serverFormInfo }, { status: 400 })
	}

	const { email } = serverFormInfo.submittedFormData
	const onboardingToken = encrypt(
		JSON.stringify({ type: tokenType, payload: { email } }),
	)
	const onboardingUrl = new URL(`${getDomainUrl(request)}/signup`)
	onboardingUrl.searchParams.set(onboardingTokenQueryParam, onboardingToken)

	// TODO: send email with the link
	console.log(onboardingUrl)

	return json({ success: true, serverFormInfo })
}

export const meta: MetaFunction = () => {
	return {
		title: 'Signup for Rocket Rental',
	}
}

export default function TempSignupParent() {
	return (
		<FormContextProvider value={{ formValidations, errorMessages }}>
			<SignupRoute />
		</FormContextProvider>
	)
}

function SignupRoute() {
	const signupFetcher = useFetcher()
	const actionData = useActionData<typeof action>()

	const emailField = useValidatedInput({
		name: 'email',
		formValidations,
		errorMessages,
		serverFormInfo: actionData?.serverFormInfo,
	})

	return (
		<div>
			<h1>Signup</h1>
			<signupFetcher.Form method="post">
				<div>
					<label
						{...emailField.getLabelAttrs({
							className: 'block text-sm font-medium text-gray-700',
						})}
					>
						Email
					</label>
					<div className="mt-1">
						<input
							{...emailField.getInputAttrs({
								className:
									'w-full rounded border border-gray-500 px-2 py-1 text-lg',
							})}
						/>

						<ListOfErrorMessages
							info={emailField.info}
							{...emailField.getErrorsAttrs({ className: '' })}
						/>
					</div>
				</div>
				<div>
					<button type="submit">Submit</button>
				</div>
			</signupFetcher.Form>
		</div>
	)
}

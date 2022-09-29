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
import { FormStrategy } from 'remix-auth-form'
import type { ErrorMessages, FormValidations } from 'remix-validity-state'
import { FormContextProvider } from 'remix-validity-state'
import { useValidatedInput } from 'remix-validity-state'
import { validateServerFormData } from 'remix-validity-state'
import { ListOfErrorMessages } from '~/components'
import { authenticator } from '~/services/auth.server'
import { commitSession, getSession } from '~/services/session.server'
import { constrain, safeRedirect } from '~/utils/misc'

export async function loader({ request }: LoaderArgs) {
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

export const formValidations = constrain<FormValidations>()({
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
})

export const errorMessages = constrain<ErrorMessages>()({
	valueMissing: (_, name) => `The ${name} field is required`,
	typeMismatch: (_, name) => `The ${name} field is invalid`,
	tooShort: (minLength, name) =>
		`The ${name} field must be at least ${minLength} characters`,
	tooLong: (maxLength, name) =>
		`The ${name} field must be less than ${maxLength} characters`,
})

export async function action({ request }: ActionArgs) {
	const formData = await request.clone().formData()
	const serverFormInfo = await validateServerFormData(formData, formValidations)
	if (!serverFormInfo.valid) {
		return json({ serverFormInfo }, { status: 400 })
	}
	const remember = formData.get('remember') === 'on'
	const redirectTo = safeRedirect(formData.get('redirectTo'), '/')

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
	return redirect(redirectTo, {
		headers: { 'Set-Cookie': newCookie },
	})
}

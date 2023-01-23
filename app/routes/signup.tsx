import type { DataFunctionArgs } from '@remix-run/node'
import { json, redirect, type V2_MetaFunction } from '@remix-run/node'
import { useFetcher, useLoaderData } from '@remix-run/react'
import { z } from 'zod'
import { prisma } from '~/utils/db.server'
import { sendEmail } from '~/utils/email.server'
import { decrypt, encrypt } from '~/utils/encryption.server'
import { getFieldsFromSchema, useForm, preprocessFormData } from '~/utils/forms'
import { getDomainUrl } from '~/utils/misc.server'
import { commitSession, getSession } from '~/utils/session.server'
import { emailSchema } from '~/utils/user-validation'

export const onboardingEmailSessionKey = 'onboardingToken'
const onboardingTokenQueryParam = 'token'
const tokenType = 'onboarding'

const SignupSchema = z.object({
	email: emailSchema.refine(
		async email => {
			const existingUser = await prisma.user.findUnique({
				where: { email },
				select: { id: true },
			})
			return !existingUser
		},
		{ message: 'A user already exists with this email' },
	),
})

export async function loader({ request }: DataFunctionArgs) {
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
	return json({ fields: getFieldsFromSchema(SignupSchema) })
}

export async function action({ request }: DataFunctionArgs) {
	const formData = await request.formData()
	const result = await SignupSchema.safeParseAsync(
		preprocessFormData(formData, SignupSchema),
	)
	if (!result.success) {
		return json(
			{
				status: 'error',
				errors: result.error.flatten(),
			},
			{ status: 400 },
		)
	}
	const { email } = result.data

	const onboardingToken = encrypt(
		JSON.stringify({ type: tokenType, payload: { email } }),
	)
	const onboardingUrl = new URL(`${getDomainUrl(request)}/signup`)
	onboardingUrl.searchParams.set(onboardingTokenQueryParam, onboardingToken)

	const response = await sendEmail({
		to: email,
		subject: `Welcome to Rocket Rental!`,
		text: `Please open this URL: ${onboardingUrl}`,
		html: `
		<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
		<html>
			<head>
				<meta http-equiv="Content-Type" content="text/html charset=UTF-8" />
			</head>
			<body>
				<h1>Welcome to Rocket Rental!</h1>
				<p>Click the link below to get started:</p>
				<a href="${onboardingUrl}">${onboardingUrl}</a>
			</body>
		`,
	})

	if (response.ok) {
		return json({ status: 'success', errors: null })
	} else {
		return json({
			status: 'error',
			errors: { formErrors: ['Email not sent successfully'], fieldErrors: {} },
		})
	}
}

export const meta: V2_MetaFunction = ({ matches }) => {
	let rootModule = matches.find(match => match.route.id === 'root')

	return [
		...(rootModule?.meta ?? [])?.filter(meta => !('title' in meta)),
		{ title: 'Sign Up | Rocket Rental' },
	]
}

export default function SignupRoute() {
	const data = useLoaderData<typeof loader>()
	const signupFetcher = useFetcher<typeof action>()
	const { form, fields } = useForm({
		name: 'signup-form',
		fieldMetadatas: data.fields,
		errors: signupFetcher.data?.errors,
	})

	return (
		<div>
			<h1>Signup</h1>
			<signupFetcher.Form method="post" {...form.props}>
				<div>
					<label
						className="block text-sm font-medium text-gray-700"
						{...fields.email.labelProps}
					>
						Email
					</label>
					<div className="mt-1">
						<input
							className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
							{...fields.email.props}
						/>
						{fields.email.errorUI}
					</div>
				</div>
				{form.errorUI}
				<div>
					<button type="submit" disabled={signupFetcher.state !== 'idle'}>
						{signupFetcher.state === 'idle' ? 'Submit' : 'Submitting...'}
					</button>
				</div>
			</signupFetcher.Form>
			{signupFetcher.data?.status === 'success' ? (
				<div>Great! Check your email for a link to continue.</div>
			) : null}
		</div>
	)
}

export function ErrorBoundary({ error }: { error: Error }) {
	console.error(error)

	return <div>An unexpected error occurred: {error.message}</div>
}

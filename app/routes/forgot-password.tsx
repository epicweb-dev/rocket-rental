import {
	json,
	redirect,
	type DataFunctionArgs,
	type V2_MetaFunction,
} from '@remix-run/node'
import { useFetcher, useLoaderData } from '@remix-run/react'
import { z } from 'zod'
import { prisma } from '~/utils/db.server'
import { sendEmail } from '~/utils/email.server'
import { decrypt, encrypt } from '~/utils/encryption.server'
import { getFieldsFromSchema, preprocessFormData, useForm } from '~/utils/forms'
import { getDomainUrl } from '~/utils/misc.server'
import { commitSession, getSession } from '~/utils/session.server'
import { emailSchema, usernameSchema } from '~/utils/user-validation'

export const resetPasswordSessionKey = 'resetPasswordToken'
const resetPasswordTokenQueryParam = 'token'
const tokenType = 'forgot-password'

const ForgotPasswordSchema = z.object({
	usernameOrEmail: z.union([emailSchema, usernameSchema]),
})

export async function loader({ request }: DataFunctionArgs) {
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
	return json({ fieldMetadatas: getFieldsFromSchema(ForgotPasswordSchema) })
}

export async function action({ request }: DataFunctionArgs) {
	const formData = await request.formData()
	const result = await ForgotPasswordSchema.safeParseAsync(
		preprocessFormData(formData, ForgotPasswordSchema),
	)
	if (!result.success) {
		return json({
			status: 'error',
			errors: result.error.flatten(),
		})
	}
	const { usernameOrEmail } = result.data

	const user = await prisma.user.findFirst({
		where: { OR: [{ email: usernameOrEmail }, { username: usernameOrEmail }] },
		select: { email: true, username: true },
	})
	if (user) {
		void sendPasswordResetEmail({ request, user })
	}

	return json({ status: 'success', errors: null })
}

async function sendPasswordResetEmail({
	request,
	user,
}: {
	request: Request
	user: { email: string; username: string }
}) {
	const resetPasswordToken = encrypt(
		JSON.stringify({ type: tokenType, payload: { username: user.username } }),
	)
	const resetPasswordUrl = new URL(`${getDomainUrl(request)}/forgot-password`)
	resetPasswordUrl.searchParams.set(
		resetPasswordTokenQueryParam,
		resetPasswordToken,
	)

	await sendEmail({
		to: user.email,
		subject: `Rocket Rental Password Reset`,
		text: `Please open this URL: ${resetPasswordUrl}`,
		html: `
		<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
		<html>
			<head>
				<meta http-equiv="Content-Type" content="text/html charset=UTF-8" />
			</head>
			<body>
				<h1>Reset your Rocket Rental password.</h1>
				<p>Click the link below to reset the rocket rental password for ${user.username}.</p>
				<a href="${resetPasswordUrl}">${resetPasswordUrl}</a>
			</body>
		`,
	})
}

export const meta: V2_MetaFunction = ({ matches }) => {
	let rootModule = matches.find(match => match.route.id === 'root')

	return [
		...(rootModule?.meta ?? [])?.filter(meta => !('title' in meta)),
		{ title: 'Password Recovery for Rocket Rental' },
	]
}

export default function SignupRoute() {
	const data = useLoaderData<typeof loader>()
	const forgotPassword = useFetcher<typeof action>()

	const { form, fields } = useForm({
		name: 'forgot-password',
		errors: forgotPassword.data?.errors,
		fieldMetadatas: data.fieldMetadatas,
	})

	return (
		<div>
			<h1>Forgot Password</h1>
			<forgotPassword.Form method="post" {...form.props}>
				<div>
					<label
						className="block text-sm font-medium text-gray-700"
						{...fields.usernameOrEmail.labelProps}
					>
						Username or Email
					</label>
					<div className="mt-1">
						<input
							className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
							{...fields.usernameOrEmail.props}
						/>
						{fields.usernameOrEmail.errorUI}
					</div>
				</div>
				{form.errorUI}
				<div>
					<button type="submit" disabled={forgotPassword.state !== 'idle'}>
						{forgotPassword.state === 'idle' ? 'Submit' : 'Submitting...'}
					</button>
				</div>
			</forgotPassword.Form>
			{forgotPassword.data?.status === 'success' ? (
				<div>Great! Check your email for a link to continue.</div>
			) : null}
		</div>
	)
}

export function ErrorBoundary({ error }: { error: Error }) {
	console.error(error)

	return <div>An unexpected error occurred: {error.message}</div>
}

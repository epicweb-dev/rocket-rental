import type { DataFunctionArgs, V2_MetaFunction } from '@remix-run/node'
import { json, redirect } from '@remix-run/node'
import {
	Form,
	useActionData,
	useLoaderData,
	useNavigation,
} from '@remix-run/react'
import { z } from 'zod'
import { authenticator, resetUserPassword } from '~/utils/auth.server'
import { getFieldsFromSchema, preprocessFormData, useForm } from '~/utils/forms'
import { commitSession, getSession } from '~/utils/session.server'
import { passwordSchema } from '~/utils/user-validation'
import { resetPasswordSessionKey } from './forgot-password'

const ResetPasswordSchema = z
	.object({
		password: passwordSchema,
		confirmPassword: passwordSchema,
	})
	.superRefine(({ confirmPassword, password }, ctx) => {
		if (confirmPassword !== password) {
			ctx.addIssue({
				path: ['confirmPassword'],
				code: 'custom',
				message: 'The passwords did not match',
			})
		}
	})

export async function loader({ request }: DataFunctionArgs) {
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
		{
			formError: error?.message,
			resetPasswordUsername,
			fieldMetadatas: getFieldsFromSchema(ResetPasswordSchema),
		},
		{
			headers: { 'Set-Cookie': await commitSession(session) },
		},
	)
}

export async function action({ request }: DataFunctionArgs) {
	const formData = await request.formData()
	const result = ResetPasswordSchema.safeParse(
		preprocessFormData(formData, ResetPasswordSchema),
	)
	if (!result.success) {
		return json(
			{ status: 'error', errors: result.error.flatten() },
			{ status: 400 },
		)
	}

	const { password } = result.data

	const session = await getSession(request.headers.get('cookie'))
	const username = session.get(resetPasswordSessionKey)
	if (typeof username !== 'string' || !username) {
		return redirect('/login')
	}
	await resetUserPassword({ username, password })
	session.unset(resetPasswordSessionKey)
	return redirect('/login', {
		headers: { 'Set-Cookie': await commitSession(session) },
	})
}

export const meta: V2_MetaFunction = ({ matches }) => {
	let rootModule = matches.find(match => match.route.id === 'root')

	return [
		...(rootModule?.meta ?? [])?.filter(meta => !('title' in meta)),
		{ title: 'Reset Password | Rocket Rental' },
	]
}

export default function ResetPasswordPage() {
	const data = useLoaderData<typeof loader>()
	const actionData = useActionData<typeof action>()
	const navigation = useNavigation()

	const { form, fields } = useForm({
		name: 'reset-password',
		errors: actionData?.errors,
		fieldMetadatas: data.fieldMetadatas,
	})

	return (
		<div className="flex min-h-full flex-col justify-center">
			<div className="mx-auto w-full max-w-md px-8">
				<Form method="post" className="space-y-6" {...form.props}>
					<div>Resetting password for {data.resetPasswordUsername}</div>

					<div>
						<label
							className="block text-sm font-medium text-gray-700"
							{...fields.password.labelProps}
						>
							Password
						</label>
						<div className="mt-1">
							<input
								autoComplete="current-password"
								className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
								{...fields.password.props}
							/>
							{fields.password.errorUI}
						</div>
					</div>

					<div>
						<label
							className="block text-sm font-medium text-gray-700"
							{...fields.confirmPassword.labelProps}
						>
							Confirm Password
						</label>
						<div className="mt-1">
							<input
								autoComplete="current-password"
								className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
								{...fields.confirmPassword.props}
							/>
							{fields.confirmPassword.errorUI}
						</div>
					</div>

					{form.errorUI}
					<div className="flex items-center justify-between gap-6">
						<button
							type="submit"
							className="w-full rounded bg-gray-500  py-2 px-4 text-white hover:bg-gray-600 focus:bg-gray-400"
							disabled={Boolean(navigation.state === 'submitting')}
						>
							{navigation.state === 'submitting'
								? 'Resetting...'
								: 'Reset Password'}
						</button>
					</div>
				</Form>
			</div>
		</div>
	)
}

export function ErrorBoundary({ error }: { error: Error }) {
	console.error(error)

	return <div>An unexpected error occurred: {error.message}</div>
}

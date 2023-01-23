import type { DataFunctionArgs } from '@remix-run/node'
import { json } from '@remix-run/node'
import { Link, useFetcher } from '@remix-run/react'
import { AuthorizationError } from 'remix-auth'
import { FormStrategy } from 'remix-auth-form'
import { z } from 'zod'
import { authenticator } from '~/utils/auth.server'
import { preprocessFormData, useForm, type FieldMetadatas } from '~/utils/forms'
import { commitSession, getSession } from '~/utils/session.server'
import { passwordSchema, usernameSchema } from '~/utils/user-validation'

export const LoginFormSchema = z.object({
	username: usernameSchema,
	password: passwordSchema,
	remember: z.boolean(),
})

export async function action({ request }: DataFunctionArgs) {
	const formData = await request.clone().formData()
	const result = LoginFormSchema.safeParse(
		preprocessFormData(formData, LoginFormSchema),
	)
	if (!result.success) {
		return json({ errors: result.error.flatten() }, { status: 400 })
	}

	let userId: string | null = null
	try {
		userId = await authenticator.authenticate(FormStrategy.name, request, {
			throwOnError: true,
		})
	} catch (error) {
		if (error instanceof AuthorizationError) {
			return json(
				{
					status: 'auth-error',
					errors: {
						formErrors: [error.message],
						fieldErrors: {},
					},
				},
				{ status: 400 },
			)
		}
		throw error
	}

	const session = await getSession(request.headers.get('cookie'))
	session.set(authenticator.sessionKey, userId)
	const { remember } = result.data
	const newCookie = await commitSession(session, {
		maxAge: remember
			? 60 * 60 * 24 * 7 // 7 days
			: undefined,
	})
	return json(
		{ status: 'success', errors: null },
		{ headers: { 'Set-Cookie': newCookie } },
	)
}

export function InlineLogin({
	fieldMetadatas,
}: {
	fieldMetadatas: FieldMetadatas<keyof z.infer<typeof LoginFormSchema>>
}) {
	const loginFetcher = useFetcher<typeof action>()

	const { form, fields } = useForm({
		name: 'inline-login',
		errors: loginFetcher.data?.errors,
		fieldMetadatas,
	})

	return (
		<div>
			<div className="mx-auto w-full max-w-md px-8">
				<loginFetcher.Form
					method="post"
					action="/resources/login"
					className="space-y-6"
					{...form.props}
				>
					<div>
						<label
							className="block text-sm font-medium text-gray-700"
							{...fields.username.labelProps}
						>
							Username
						</label>
						<div className="mt-1">
							<input
								autoComplete="username"
								className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
								{...fields.username.props}
							/>
							{fields.username.errorUI}
						</div>
					</div>

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
								type="password"
							/>
							{fields.password.errorUI}
						</div>
					</div>

					<div className="flex items-center">
						<input
							className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
							{...fields.remember.props}
						/>
						<label
							className="ml-2 block text-sm text-gray-900"
							{...fields.remember.labelProps}
						>
							Remember me
						</label>
					</div>

					{form.errorUI}

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

import type { DataFunctionArgs, V2_MetaFunction } from '@remix-run/node'
import { json, redirect } from '@remix-run/node'
import {
	Form,
	Link,
	useActionData,
	useLoaderData,
	useSearchParams,
} from '@remix-run/react'
import { useEffect, useRef } from 'react'
import { FormStrategy } from 'remix-auth-form'
import { z } from 'zod'
import { authenticator } from '~/utils/auth.server'
import {
	getFields,
	getFieldMetadatas,
	getFormProps,
	preprocessFormData,
	useFocusInvalid,
} from '~/utils/forms'
import { safeRedirect } from '~/utils/misc'
import { commitSession, getSession } from '~/utils/session.server'
import { passwordSchema, usernameSchema } from '~/utils/user-validation'

const LoginFormSchema = z.object({
	username: usernameSchema,
	password: passwordSchema,
	remember: z.boolean(),
	redirectTo: z.string().optional(),
})

export async function loader({ request }: DataFunctionArgs) {
	await authenticator.isAuthenticated(request, {
		successRedirect: '/',
	})
	const session = await getSession(request.headers.get('cookie'))
	const error = session.get(authenticator.sessionErrorKey)
	let errorMessage: string | null = null
	if (typeof error?.message === 'string') {
		errorMessage = error.message
	}
	return json(
		{
			formError: errorMessage,
			fieldMetadatas: getFieldMetadatas(LoginFormSchema),
		},
		{
			headers: {
				'Set-Cookie': await commitSession(session),
			},
		},
	)
}

export async function action({ request }: DataFunctionArgs) {
	const formData = await request.clone().formData()
	const result = LoginFormSchema.safeParse(
		preprocessFormData(formData, LoginFormSchema),
	)
	if (!result.success) {
		return json({ errors: result.error.flatten() }, { status: 400 })
	}
	const { remember, redirectTo } = result.data

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
	return redirect(safeRedirect(redirectTo), {
		headers: { 'Set-Cookie': newCookie },
	})
}

export const meta: V2_MetaFunction = ({ matches }) => {
	let rootModule = matches.find(match => match.route.id === 'root')

	return [
		...(rootModule?.meta ?? [])?.filter(meta => !('title' in meta)),
		{ title: 'Login to Rocket Rental' },
	]
}

export default function LoginPage() {
	const [searchParams] = useSearchParams()
	const formRef = useRef<HTMLFormElement>(null)
	const data = useLoaderData<typeof loader>()
	const actionData = useActionData<typeof action>()

	const fields = getFields(data.fieldMetadatas, actionData?.errors.fieldErrors)

	const form = getFormProps({
		name: 'login',
		errors: [...(actionData?.errors.formErrors ?? []), data.formError],
	})

	const redirectTo = searchParams.get('redirectTo') || '/'

	useFocusInvalid(formRef.current, actionData?.errors)

	return (
		<div className="flex min-h-full flex-col justify-center">
			<div className="mx-auto w-full max-w-md px-8">
				<Form
					method="post"
					className="space-y-6"
					{...form.props}
					noValidate
					ref={formRef}
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
								autoFocus={true}
								required
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

					<input
						{...fields.redirectTo.props}
						type="hidden"
						value={redirectTo}
					/>

					{form.errorUI}

					<div className="flex items-center justify-between gap-6">
						<button
							type="submit"
							className="w-full rounded bg-blue-500  py-2 px-4 text-white hover:bg-blue-600 focus:bg-blue-400"
						>
							Log in
						</button>
					</div>
				</Form>
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

export function ErrorBoundary({ error }: { error: Error }) {
	console.error(error)

	return <div>An unexpected error occurred: {error.message}</div>
}

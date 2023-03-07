import type { DataFunctionArgs, V2_MetaFunction } from '@remix-run/node'
import { json } from '@remix-run/node'
import { useLoaderData, useSearchParams } from '@remix-run/react'
import { authenticator } from '~/utils/auth.server'
import { commitSession, getSession } from '~/utils/session.server'
import { InlineLogin } from './resources+/login'

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
		{ formError: errorMessage },
		{
			headers: {
				'Set-Cookie': await commitSession(session),
			},
		},
	)
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
	const data = useLoaderData<typeof loader>()

	const redirectTo = searchParams.get('redirectTo') || '/'

	return (
		<div className="flex min-h-full flex-col justify-center">
			<div className="mx-auto w-full max-w-md px-8">
				<InlineLogin redirectTo={redirectTo} formError={data.formError} />
			</div>
		</div>
	)
}

export function ErrorBoundary({ error }: { error: Error }) {
	console.error(error)

	return <div>An unexpected error occurred: {error.message}</div>
}

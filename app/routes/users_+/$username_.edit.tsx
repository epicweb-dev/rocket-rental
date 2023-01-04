import type { DataFunctionArgs } from '@remix-run/node'
import { json } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { requireUser } from '~/utils/auth.server'

export async function loader({ request }: DataFunctionArgs) {
	const user = await requireUser(request)
	return json({ user })
}

export default function EditUserProfile() {
	const data = useLoaderData<typeof loader>()

	return <pre>{JSON.stringify(data, null, 2)}</pre>
}

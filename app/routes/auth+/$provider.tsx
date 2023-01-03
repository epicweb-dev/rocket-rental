import type { DataFunctionArgs } from '@remix-run/node'
import { redirect } from '@remix-run/node'
import invariant from 'tiny-invariant'
import { authenticator } from '~/utils/auth.server'

export function loader() {
	return redirect('/login')
}

export function action({ request, params }: DataFunctionArgs) {
	invariant(typeof params.provider === 'string', 'provider is required')
	return authenticator.authenticate(params.provider, request)
}

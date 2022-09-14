import type { ActionArgs } from '@remix-run/server-runtime'
import { redirect } from '@remix-run/node'
import { authenticator } from '~/services/auth.server'
import invariant from 'tiny-invariant'

export function loader() {
	return redirect('/login')
}

export function action({ request, params }: ActionArgs) {
	invariant(typeof params.provider === 'string', 'provider is required')
	return authenticator.authenticate(params.provider, request)
}

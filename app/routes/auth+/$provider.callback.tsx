import type { DataFunctionArgs } from '@remix-run/server-runtime'
import invariant from 'tiny-invariant'
import { authenticator } from '~/utils/auth.server'

export function loader({ request, params }: DataFunctionArgs) {
	invariant(typeof params.provider === 'string', 'provider is required')
	return authenticator.authenticate(params.provider, request, {
		successRedirect: '/dashboard',
		failureRedirect: '/login',
	})
}

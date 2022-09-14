import type { LoaderArgs } from '@remix-run/server-runtime'
import invariant from 'tiny-invariant'
import { authenticator } from '~/services/auth.server'

export function loader({ request, params }: LoaderArgs) {
	invariant(typeof params.provider === 'string', 'provider is required')
	return authenticator.authenticate(params.provider, request, {
		successRedirect: '/dashboard',
		failureRedirect: '/login',
	})
}

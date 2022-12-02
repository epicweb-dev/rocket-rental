import { useMatches } from '@remix-run/react'
import { cloneElement, useMemo } from 'react'

import type { User } from '~/models/user.server'

const DEFAULT_REDIRECT = '/'

/**
 * This should be used any time the redirect path is user-provided
 * (Like the query string on our login/signup pages). This avoids
 * open-redirect vulnerabilities.
 * @param {string} to The redirect destination
 * @param {string} defaultRedirect The redirect to use if the to is unsafe.
 */
export function safeRedirect(
	to: FormDataEntryValue | string | null | undefined,
	defaultRedirect: string = DEFAULT_REDIRECT,
) {
	if (!to || typeof to !== 'string') {
		return defaultRedirect
	}

	if (!to.startsWith('/') || to.startsWith('//')) {
		return defaultRedirect
	}

	return to
}

/**
 * This base hook is used in other hooks to quickly search for specific data
 * across all loader data using useMatches.
 * @param {string} id The route id
 * @returns {JSON|undefined} The router data or undefined if not found
 */
export function useMatchesData(
	id: string,
): Record<string, unknown> | undefined {
	const matchingRoutes = useMatches()
	const route = useMemo(
		() => matchingRoutes.find(route => route.id === id),
		[matchingRoutes, id],
	)
	return route?.data
}

function isUser(user: any): user is User {
	return user && typeof user === 'object' && typeof user.email === 'string'
}

export function useOptionalUser(): User | undefined {
	const data = useMatchesData('root')
	if (!data || !isUser(data.user)) {
		return undefined
	}
	return data.user
}

export function useUser(): User {
	const maybeUser = useOptionalUser()
	if (!maybeUser) {
		throw new Error(
			'No user found in root loader, but user is required by useUser. If user is optional, try useOptionalUser instead.',
		)
	}
	return maybeUser
}

export function validateEmail(email: unknown): email is string {
	return typeof email === 'string' && email.length > 3 && email.includes('@')
}

export function getErrorInfo<Key extends string>({
	idPrefix,
	errors,
	names,
	ui,
}: {
	idPrefix?: string
	errors: Record<string, string | null> | null | undefined
	names: Array<Key>
	ui: React.ReactElement
}) {
	const info = names.reduce((acc, name) => {
		if (errors?.[name]) {
			const errorElId = [idPrefix, name, 'error'].filter(Boolean).join('-')
			acc[name] = {
				fieldProps: {
					'aria-invalid': true,
					'aria-describedby': errorElId,
				},
				errorUI: cloneElement(ui, {
					id: errorElId,
					children: errors[name],
				}),
			}
		} else {
			acc[name] = {}
		}
		return acc
	}, {} as Record<Key, { fieldProps?: { 'aria-invalid': true; 'aria-describedby': string }; errorUI?: React.ReactElement }>)
	return info
}

export function typedBoolean<T>(
	value: T,
): value is Exclude<T, false | null | undefined | '' | 0> {
	return Boolean(value)
}

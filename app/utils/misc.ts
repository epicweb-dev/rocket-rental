import { type SerializeFrom } from '@remix-run/node'
import { useRouteLoaderData } from '@remix-run/react'
import { type loader as rootLoader } from '~/root'

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

function isUser(user: any): user is SerializeFrom<typeof rootLoader>['user'] {
	return user && typeof user === 'object' && typeof user.id === 'string'
}

export function useOptionalUser() {
	const data = useRouteLoaderData('root') as SerializeFrom<typeof rootLoader>
	if (!data || !isUser(data.user)) {
		return undefined
	}
	return data.user
}

export function useUser() {
	const maybeUser = useOptionalUser()
	if (!maybeUser) {
		throw new Error(
			'No user found in root loader, but user is required by useUser. If user is optional, try useOptionalUser instead.',
		)
	}
	return maybeUser
}

export function typedBoolean<T>(
	value: T,
): value is Exclude<T, false | null | undefined | '' | 0> {
	return Boolean(value)
}

export function getImgSrc(imageId: string) {
	return `/images/${imageId}`
}

export function getShipImgSrc(imageId?: string | null) {
	// TODO: make this real I guess
	return imageId ? `/images/${imageId}` : `/img/ship.png`
}

export function getUserImgSrc(imageId?: string | null) {
	// TODO: make this real I guess
	return imageId ? `/images/${imageId}` : `/img/user.png`
}

export function getErrorMessage(error: unknown) {
	if (typeof error === 'string') return error
	if (
		error &&
		typeof error === 'object' &&
		'message' in error &&
		typeof error.message === 'string'
	) {
		return error.message
	}
	console.error('Unable to get error message for error', error)
	return 'Unknown Error'
}

type ListFormatOptions = {
	type?: 'conjunction' | 'disjunction' | 'unit'
	style?: 'long' | 'short' | 'narrow'
	localeMatcher?: 'lookup' | 'best fit'
}
declare namespace Intl {
	class ListFormat {
		constructor(locale: string, options: ListFormatOptions)
		public format: (items: Array<string>) => string
	}
}

type ListifyOptions<ItemType> = {
	type?: ListFormatOptions['type']
	style?: ListFormatOptions['style']
	stringify?: (item: ItemType) => string
}
export function listify<ItemType extends { toString(): string }>(
	array: Array<ItemType>,
	{
		type = 'conjunction',
		style = 'long',
		stringify = (thing: { toString(): string }) => thing.toString(),
	}: ListifyOptions<ItemType> = {},
) {
	const stringified = array.map(item => stringify(item))
	const formatter = new Intl.ListFormat('en', { style, type })
	return formatter.format(stringified)
}

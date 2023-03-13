import clsx from 'clsx'
import * as React from 'react'
import { type DataHTMLAttributes, type StyleHTMLAttributes } from 'react'

type TagNameBase = keyof JSX.IntrinsicElements | void

type Props<TagName extends TagNameBase = void> = {
	as?: TagName
} & Attributes<TagName>

export type Attributes<TagName extends TagNameBase = void> =
	(TagName extends keyof JSX.IntrinsicElements
		? JSX.IntrinsicElements[TagName]
		: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>) &
		DataHTMLAttributes<TagName> & { style?: StyleHTMLAttributes<TagName> }

export function Text<TagName extends TagNameBase = void>(
	props: Props<TagName>,
) {
	return React.createElement(props.as || 'span', {
		...props,
		className: clsx(props.className, 'text-white'),
	})
}

const headerSizeClassNames = {
	mega: 'text-mega font-bold',
	h1: 'text-6xl font-bold',
	h2: 'text-5xl font-bold',
	h3: 'text-4xl font-bold',
	h4: 'text-3xl font-bold',
	h5: 'text-2xl font-bold',
	h6: 'text-xl font-bold',
}

const bodySizeClassNames = {
	l: '',
}

const defaultTheme = require('tailwindcss/defaultTheme')

/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ['./app/**/*.{ts,tsx,jsx,js}'],
	darkMode: 'class',
	theme: {
		extend: {
			colors: {
				primary: {
					DEFAULT: '#6A44FF',
					// TODO: get rid of lighter/darker?
					lighter: '#7e5dff',
					darker: '#623fe7',
				},
				secondary: '#FFBE3F',
				tertiary: '#FFD262',
				night: {
					DEFAULT: '#090909',
					'muted-dark': '#141414',
					muted: '#1E1E20',
					lite: '#494949',
				},
				label: {
					'light-gray': '#AAAAAA',
					'dark-gray': '#717171',
					'light-purple': '#9999CC',
				},
				day: {
					DEFAULT: '#F7F5FF',
					muted: '#DDDDF4',
					lite: '#DADADA',
				},
			},
			fontFamily: {
				sans: ['Nunito Sans', ...defaultTheme.fontFamily.sans],
			},
			fontSize: {
				'7.5xl': [
					'5rem',
					{
						lineHeight: '5.25rem',
						fontWeight: '600',
					},
				],
			},
		},
	},
	plugins: [require('@tailwindcss/line-clamp'), require('tailwindcss-radix')],
}

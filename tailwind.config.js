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
					lighter: '#7e5dff',
					darker: '#623fe7',
				},
				secondary: '#FCBE25',
				tertiary: '#FF7A00',
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
			keyframes: {
				marquee: {
					from: { transform: 'translateX(0)' },
					to: { transform: 'translateX(-100%)' },
				},
				marqueeReverse: {
					from: { transform: 'translateX(0)' },
					to: { transform: 'translateX(100%)' },
				},
			},
			animation: {
				marquee: 'marquee 40s linear infinite',
				'marquee-reverse': 'marqueeReverse 40s linear infinite',
			},
		},
	},
	plugins: [require('@tailwindcss/line-clamp')],
}

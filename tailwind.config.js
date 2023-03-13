const defaultTheme = require('tailwindcss/defaultTheme')

/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ['./app/**/*.{ts,tsx,jsx,js}'],
	darkMode: 'class',
	theme: {
		extend: {
			colors: {
				night: {
					100: '#DADADA',
					200: '#AAAAAA',
					300: '#717171',
					400: '#494949',
					500: '#1E1E20',
					600: '#141414',
					700: '#090909',
				},
				day: {
					100: '#F7F5FF',
					200: '#E4E4FB',
					300: '#DDDDF4',
					400: '#D0D0E8',
					500: '#9696E0',
					600: '#9999CC',
					700: '#6A44FF',
				},
				accent: {
					purple: '#6A44FF',
					pink: '#F183FF',
					yellow: '#FFBE3F',
					'yellow-muted': '#FFD262',
				},
			},
			fontFamily: {
				sans: ['Nunito Sans', ...defaultTheme.fontFamily.sans],
			},
			fontSize: {
				mega: ['5rem', { lineHeight: '5.25rem', fontWeight: '700' }],
				h1: ['3.5rem', { lineHeight: '3.875rem', fontWeight: '700' }],
				h2: ['2.5rem', { lineHeight: '3rem', fontWeight: '700' }],
				h3: ['2rem', { lineHeight: '2.25rem', fontWeight: '700' }],
				h4: ['1.75rem', { lineHeight: '2.25rem', fontWeight: '700' }],
				h5: ['1.5rem', { lineHeight: '2rem', fontWeight: '700' }],
				h6: ['1.25rem', { lineHeight: '1.75rem', fontWeight: '700' }],
				'body-lg': ['1.5rem', { lineHeight: '2rem' }],
				'body-m': ['1.25rem', { lineHeight: '1.75rem' }],
				'body-sm': ['1rem', { lineHeight: '1.25rem' }],
				'body-xs': ['0.875rem', { lineHeight: '1.125rem' }],
				'body-xxs': ['0.75rem', { lineHeight: '1rem' }],
				caption: ['1.125rem', { lineHeight: '1.5rem', fontWeight: '600' }],
				button: ['0.75rem', { lineHeight: '1rem', fontWeight: '700' }],
			},
			backgroundImage: {
				'smooth-vert': `linear-gradient(234.33deg, #F183FF -17.47%, #899BFF 47.56%, rgba(156, 178, 254, 0.984611) 81.11%);`,
				'tight-diag': `linear-gradient(235.62deg, #F6AFFF 9.34%, #D6ADFF 49.88%, #9C9AFE 65.08%, rgba(100, 129, 233, 0.984611) 101.52%);`,
				'smooth-diag': `linear-gradient(193.36deg, #ED82FB 9.98%, #B16AF8 37.93%, #706DF2 58.33%, #5B72F5 74.02%, rgba(91, 119, 220, 0.984611) 96.89%);`,
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
	plugins: [require('@tailwindcss/line-clamp'), require('tailwindcss-radix')],
}

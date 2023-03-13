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
					red: '#EF5A5A',
				},
			},
			fontFamily: {
				sans: ['Nunito Sans', ...defaultTheme.fontFamily.sans],
			},
			fontSize: {
				// 1rem = 16px
				/** 80px size / 84px high / bold */
				mega: ['5rem', { lineHeight: '5.25rem', fontWeight: '700' }],
				/** 56px size / 62px high / bold */
				h1: ['3.5rem', { lineHeight: '3.875rem', fontWeight: '700' }],
				/** 40px size / 48px high / bold */
				h2: ['2.5rem', { lineHeight: '3rem', fontWeight: '700' }],
				/** 32px size / 36px high / bold */
				h3: ['2rem', { lineHeight: '2.25rem', fontWeight: '700' }],
				/** 28px size / 36px high / bold */
				h4: ['1.75rem', { lineHeight: '2.25rem', fontWeight: '700' }],
				/** 24px size / 32px high / bold */
				h5: ['1.5rem', { lineHeight: '2rem', fontWeight: '700' }],
				/** 16px size / 20px high / bold */
				h6: ['1rem', { lineHeight: '1.25rem', fontWeight: '700' }],

				/** 32px size / 36px high / normal */
				'body-2xl': ['2rem', { lineHeight: '2.25rem' }],
				/** 28px size / 36px high / normal */
				'body-xl': ['1.75rem', { lineHeight: '2.25rem' }],
				/** 24px size / 32px high / normal */
				'body-lg': ['1.5rem', { lineHeight: '2rem' }],
				/** 20px size / 28px high / normal */
				'body-md': ['1.25rem', { lineHeight: '1.75rem' }],
				/** 16px size / 20px high / normal */
				'body-sm': ['1rem', { lineHeight: '1.25rem' }],
				/** 14px size / 18px high / normal */
				'body-xs': ['0.875rem', { lineHeight: '1.125rem' }],
				/** 12px size / 16px high / normal */
				'body-2xs': ['0.75rem', { lineHeight: '1rem' }],

				/** 18px size / 24px high / semibold */
				caption: ['1.125rem', { lineHeight: '1.5rem', fontWeight: '600' }],
				/** 12px size / 16px high / bold */
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

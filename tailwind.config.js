/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ['./app/**/*.{ts,tsx,jsx,js}'],
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
				marquee: 'marquee 10s linear infinite',
				'marquee-reverse': 'marqueeReverse 10s linear infinite',
			},
		},
	},
	plugins: [],
}

require('dotenv/config')

if (process.env.MOCKS === 'true') {
	require('./mocks')
}

if (process.env.NODE_ENV === 'production') {
	import('./server-build/index.js')
} else {
	require('./server')
}

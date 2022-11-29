import { RemixBrowser } from '@remix-run/react'
import { hydrateRoot } from 'react-dom/client'
import { init as initDevtools } from '~/utils/devtools'

if (ENV.MODE === 'development') {
	initDevtools()
}
hydrateRoot(document, <RemixBrowser />)

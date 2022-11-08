import { useFetcher } from '@remix-run/react'
import { useCallback, useEffect, useMemo, useRef } from 'react'

// TODO: Swap this with react-router's useRevalidator when Remix adds support for it.
export function useRevalidator() {
	const { submit } = useFetcher()

	const revalidate = useCallback(() => {
		submit(null, { action: '/', method: 'post' })
	}, [submit])

	return useMemo(() => ({ revalidate }), [revalidate])
}

export function useEventSource(
	href: string,
	onMessage: (this: EventSource, event: EventSourceEventMap['message']) => void,
) {
	const latestOnMessageRef = useLatestRef(onMessage)
	useEffect(() => {
		const source = new EventSource(href)
		source.addEventListener('message', latestOnMessageRef.current)
		return () => source.close()
	}, [href, latestOnMessageRef])
}

function useLatestRef<ThingType>(thing: ThingType) {
	const latestRef = useRef(thing)
	useEffect(() => {
		latestRef.current = thing
	})
	return latestRef
}

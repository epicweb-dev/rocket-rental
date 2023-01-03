import { useEffect, useRef } from 'react'

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

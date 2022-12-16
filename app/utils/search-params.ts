export function addParamToSet(
	searchParams: URLSearchParams,
	key: string,
	value: string,
) {
	const values = searchParams.getAll(key)
	if (!values.includes(value)) {
		searchParams.append(key, value)
	}
	return searchParams
}

export function unappend(
	searchParams: URLSearchParams,
	key: string,
	value: string,
) {
	const values = searchParams.getAll(key).filter(v => v !== value)
	searchParams.delete(key)
	for (const value of values) {
		searchParams.append(key, value)
	}
	return searchParams
}

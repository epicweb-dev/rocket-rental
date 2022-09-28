import type { LoaderArgs } from '@remix-run/node'
import { json } from '@remix-run/node'
import { Outlet, useLoaderData } from '@remix-run/react'
import { prisma } from '~/db.server'

export async function loader({ request }: LoaderArgs) {
	const searchParams = new URL(request.url).searchParams
	const name = searchParams.getAll('name')
	const starports = await prisma.starport.findMany({
		where: {
			name: name.length ? { in: name } : undefined,
		},
		select: {
			id: true,
			name: true,
			latitude: true,
			longitude: true,
			_count: {
				select: { ships: true },
			},
		},
	})
	return json({ starports })
}

export default function ShipsRoute() {
	const data = useLoaderData<typeof loader>()
	return (
		<div>
			<h1>Starports</h1>
			<pre>{JSON.stringify(data, null, 2)}</pre>
		</div>
	)
}

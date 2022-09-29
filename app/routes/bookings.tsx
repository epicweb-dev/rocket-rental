import type { LoaderArgs } from '@remix-run/node'
import { json } from '@remix-run/node'
import { Outlet, useLoaderData } from '@remix-run/react'
import { prisma } from '~/db.server'
import { requireUserId } from '~/services/auth.server'

export async function loader({ request }: LoaderArgs) {
	const userId = await requireUserId(request)
	const bookings = await prisma.booking.findMany({
		where: { renterId: userId },
		select: { id: true },
	})
	return json({ bookings })
}

export default function BookingsRoute() {
	const data = useLoaderData<typeof loader>()
	return (
		<div>
			<h1>Bookings</h1>
			<pre>{JSON.stringify(data, null, 2)}</pre>
			<hr />
			<Outlet />
		</div>
	)
}

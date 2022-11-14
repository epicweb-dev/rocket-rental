import type { DataFunctionArgs } from '@remix-run/node'
import { json } from '@remix-run/node'
import { Link, Outlet, useLoaderData } from '@remix-run/react'
import { prisma } from '~/db.server'
import { requireUserId } from '~/utils/auth.server'

export async function loader({ request }: DataFunctionArgs) {
	const userId = await requireUserId(request)
	const bookings = await prisma.booking.findMany({
		where: {
			OR: [{ renterId: userId }, { ship: { hostId: userId } }],
		},
		select: { id: true },
	})
	return json({ bookings })
}

export default function BookingsRoute() {
	const data = useLoaderData<typeof loader>()
	return (
		<div>
			<h1>Bookings</h1>
			<details>
				<summary>Data</summary>
				<pre>{JSON.stringify(data, null, 2)}</pre>
			</details>
			<div className="flex gap-12">
				<ul>
					{data.bookings.map(booking => (
						<li key={booking.id}>
							<Link to={booking.id}>{booking.id}</Link>
						</li>
					))}
				</ul>
				<div className="flex-1">
					<Outlet />
				</div>
			</div>
		</div>
	)
}

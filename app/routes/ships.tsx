import type { LoaderArgs } from '@remix-run/node'
import { json } from '@remix-run/node'
import { Outlet, useLoaderData } from '@remix-run/react'
import { prisma } from '~/db.server'

export async function loader({ request }: LoaderArgs) {
	const searchParams = new URL(request.url).searchParams
	const brandId = searchParams.getAll('brandId')
	const hostId = searchParams.getAll('hostId')
	const capacityMin = searchParams.get('capacityMin')
	const capacityMax = searchParams.get('capacityMax')
	const dailyChargeMin = searchParams.get('dailyChargeMin')
	const dailyChargeMax = searchParams.get('dailyChargeMax')
	const ships = await prisma.ship.findMany({
		where: {
			brandId: brandId.length ? { in: brandId } : undefined,
			hostId: hostId.length ? { in: hostId } : undefined,
			dailyCharge:
				dailyChargeMin || dailyChargeMax
					? {
							gte: dailyChargeMin ? Number(dailyChargeMin) : undefined,
							lte: dailyChargeMax ? Number(dailyChargeMax) : undefined,
					  }
					: undefined,
			capacity:
				capacityMin || capacityMax
					? {
							gte: capacityMin ? Number(capacityMin) : undefined,
							lte: capacityMax ? Number(capacityMax) : undefined,
					  }
					: undefined,
		},
		select: {
			id: true,
			brandId: true,
			capacity: true,
			dailyCharge: true,
			hostId: true,
		},
	})
	return json({ ships })
}

export default function ShipsRoute() {
	const data = useLoaderData<typeof loader>()
	return (
		<div>
			<h1>Ships</h1>
			<pre>{JSON.stringify(data, null, 2)}</pre>
			<hr />
			<Outlet />
		</div>
	)
}

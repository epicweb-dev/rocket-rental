import type { LoaderArgs } from '@remix-run/node'
import { redirect } from '@remix-run/node'
import { json } from '@remix-run/node'
import { Form, useLoaderData, useSearchParams } from '@remix-run/react'
import { prisma } from '~/db.server'

export async function loader({ request }: LoaderArgs) {
	const searchParams = new URL(request.url).searchParams
	const query = searchParams.get('query')
	if (query === '') return redirect('/starports')
	const starports = await prisma.starport.findMany({
		where: {
			name: query ? { contains: query } : undefined,
		},
		select: {
			id: true,
			name: true,
			latitude: true,
			longitude: true,
			imageUrl: true,
			_count: {
				select: { ships: true },
			},
		},
	})
	return json({ starports })
}

export default function ShipsRoute() {
	const data = useLoaderData<typeof loader>()
	const [searchParams] = useSearchParams()
	return (
		<div>
			<h1>Starports</h1>
			<Form action="/starports">
				<input
					name="query"
					placeholder="Search"
					defaultValue={searchParams.get('query') ?? ''}
				/>
			</Form>
			<ul>
				{data.starports.map(starport => (
					<li key={starport.id} className="p-6">
						<a
							href={`/starports/${starport.id}`}
							className="flex gap-4 bg-slate-400"
						>
							<img
								src={starport.imageUrl}
								alt=""
								className="inline aspect-square w-16 rounded-sm"
							/>
							<span>
								{starport.name} ({starport.latitude}, {starport.longitude})
							</span>
							<span>({starport._count.ships} ships)</span>
						</a>
					</li>
				))}
			</ul>
		</div>
	)
}

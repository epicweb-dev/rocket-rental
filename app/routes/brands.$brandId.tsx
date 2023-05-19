import { json, type DataFunctionArgs } from '@remix-run/node'
import { Outlet, useLoaderData } from '@remix-run/react'
import invariant from 'tiny-invariant'
import { GeneralErrorBoundary } from '~/components/error-boundary.tsx'
import { prisma } from '~/utils/db.server.ts'

export async function loader({ params }: DataFunctionArgs) {
	invariant(params.brandId, 'Missing brandId')
	const shipBrand = await prisma.shipBrand.findFirst({
		where: { id: params.brandId },
	})

	if (!shipBrand) {
		throw new Response('not found', { status: 404 })
	}
	return json({ shipBrand })
}

export default function BrandRoute() {
	const data = useLoaderData<typeof loader>()
	return (
		<div>
			<h1 className="text-h1">Ship Brand</h1>
			<pre>{JSON.stringify(data, null, 2)}</pre>
			<hr />
			<Outlet />
		</div>
	)
}

export function ErrorBoundary() {
	return (
		<GeneralErrorBoundary
			statusHandlers={{
				404: ({ params }) => <p>Brand "{params.brandId}" not found</p>,
			}}
		/>
	)
}

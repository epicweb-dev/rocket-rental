import { json, type DataFunctionArgs } from '@remix-run/node'
import { Outlet, useLoaderData } from '@remix-run/react'
import invariant from 'tiny-invariant'
import { GeneralErrorBoundary } from '~/components/error-boundary'
import { prisma } from '~/utils/db.server'

export async function loader({ params }: DataFunctionArgs) {
	invariant(params.modelId, 'Missing modelId')
	const shipModel = await prisma.shipModel.findFirst({
		where: { id: params.modelId },
	})

	if (!shipModel) {
		throw new Response('not found', { status: 404 })
	}
	return json({ shipModel })
}

export default function ModelRoute() {
	const data = useLoaderData<typeof loader>()
	return (
		<div>
			<h1 className="text-h1">Ship Model</h1>
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
				404: () => <p>Model not found</p>,
			}}
		/>
	)
}

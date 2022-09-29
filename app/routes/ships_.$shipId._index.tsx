import type { LoaderArgs } from '@remix-run/node'
import type { ActionArgs } from '@remix-run/node'
import { redirect, json } from '@remix-run/node'
import { useActionData } from '@remix-run/react'
import invariant from 'tiny-invariant'
import * as df from 'date-fns'
import { Booker } from './resources.booker'
import { Form, useLoaderData, useParams } from '@remix-run/react'
import {
	bookingSessionKey,
	getIsShipAvailable,
	validateBookerForm,
} from '~/utils/booker'
import { commitSession, getSession } from '~/services/session.server'

export async function loader({ params }: LoaderArgs) {
	invariant(params.shipId, 'Missing shipId')

	const bookingRange = {
		start: df.addDays(new Date(), 2),
		end: df.addDays(new Date(), 5),
	}

	return json({
		isAvailableInRange: await getIsShipAvailable({
			shipId: params.shipId,
			startDate: bookingRange.start,
			endDate: bookingRange.end,
		}),
		bookingRangeStart: df.format(bookingRange.start, 'yyyy-MM-dd'),
		bookingRangeEnd: df.format(bookingRange.end, 'yyyy-MM-dd'),
	})
}

export async function action({ request }: ActionArgs) {
	const formData = await request.formData()
	const serverFormInfo = await validateBookerForm(formData)
	if (!serverFormInfo.valid) {
		return json({ type: 'error', serverFormInfo } as const, { status: 400 })
	}
	const { startDate, endDate, shipId } = serverFormInfo.submittedFormData
	const session = await getSession(request.headers.get('cookie'))
	session.set(bookingSessionKey, { shipId, startDate, endDate })
	return redirect(`/ships/${shipId}/book`, {
		headers: { 'Set-Cookie': await commitSession(session) },
	})
}

export default function ShipIndexRoute() {
	const { shipId } = useParams()
	const data = useLoaderData<typeof loader>()
	const actionData = useActionData<typeof action>()
	invariant(shipId, 'Missing shipId')
	return (
		<div>
			<p>Book this rocket</p>
			{/* TODO: figure out why I have to specify the action to avoid a console warning */}
			<Form action={`/ships/${shipId}?index`} method="post">
				<Booker
					shipId={shipId}
					initialIsAvailable={data.isAvailableInRange}
					initialStartDate={data.bookingRangeStart}
					initialEndDate={data.bookingRangeEnd}
					serverFormInfo={
						actionData?.type === 'error' ? actionData.serverFormInfo : null
					}
				/>
			</Form>
		</div>
	)
}

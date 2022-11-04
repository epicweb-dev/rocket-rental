import {
	redirect,
	json,
	type ActionArgs,
	type LoaderArgs,
} from '@remix-run/node'
import { Form, useLoaderData, useParams, useActionData } from '@remix-run/react'
import invariant from 'tiny-invariant'
import * as df from 'date-fns'
import { commitSession, getSession } from '~/services/session.server'
import {
	Booker,
	bookingSessionKey,
	getIsShipAvailable,
	validateBookerForm,
} from './resources.booker'

export async function loader({ request, params }: LoaderArgs) {
	invariant(params.shipId, 'Missing shipId')
	const session = await getSession(request.headers.get('cookie'))
	const { startDate, endDate } = session.get(bookingSessionKey) ?? {}

	const bookingRange = {
		start: startDate ? df.parseISO(startDate) : df.addDays(new Date(), 2),
		end: endDate ? df.parseISO(endDate) : df.addDays(new Date(), 5),
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
	const result = validateBookerForm(formData)
	if (!result.ok) {
		return json({ status: 'error', errors: result.errors }, { status: 400 })
	}

	const { shipId, startDate, endDate } = result.data
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
			<Form method="post">
				<Booker
					shipId={shipId}
					initialIsAvailable={data.isAvailableInRange}
					initialStartDate={data.bookingRangeStart}
					initialEndDate={data.bookingRangeEnd}
					errors={actionData?.errors}
				/>
			</Form>
		</div>
	)
}

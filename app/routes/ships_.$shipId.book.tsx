import type { DataFunctionArgs } from '@remix-run/node'
import { redirect } from '@remix-run/node'
import { json } from '@remix-run/node'
import { Form, useActionData, useLoaderData } from '@remix-run/react'
import { Link } from 'react-router-dom'
import invariant from 'tiny-invariant'
import { prisma } from '~/utils/db.server'
import { requireUserId } from '~/utils/auth.server'
import { getSession, commitSession } from '~/utils/session.server'
import { useOptionalUser } from '~/utils/misc'
import { InlineLogin } from './resources.login'
import * as df from 'date-fns'
import {
	bookingSessionKey,
	getIsShipAvailable,
	validateBookerForm,
} from './resources.booker'

function createFormDataFromEntries(
	entries: Array<[string, FormDataEntryValue]>,
) {
	const formData = new FormData()
	for (const [key, value] of entries) {
		formData.append(key, value)
	}
	return formData
}

async function calculateTotalPrice({
	shipId,
	startDate,
	endDate,
}: {
	shipId: string
	startDate: Date
	endDate: Date
}) {
	const ship = await prisma.ship.findUnique({
		where: { id: shipId },
		select: { dailyCharge: true },
	})
	if (!ship) {
		throw new Response('ship not found', { status: 404 })
	}

	const totalPrice = ship.dailyCharge * df.differenceInDays(endDate, startDate)

	return Math.ceil(totalPrice)
}

export async function loader({ request, params }: DataFunctionArgs) {
	invariant(params.shipId, 'Missing shipId')
	const session = await getSession(request.headers.get('cookie'))
	const booking = session.get(bookingSessionKey)
	if (!booking) {
		return redirect(`/ships/${params.shipId}`)
	}
	const result = validateBookerForm(
		createFormDataFromEntries([
			['shipId', booking.shipId],
			['startDate', booking.startDate],
			['endDate', booking.endDate],
		]),
	)
	if (!result.ok) {
		return redirect(`/ships/${params.shipId}`)
	}
	const { startDate, endDate, shipId } = result.data
	const totalPrice = await calculateTotalPrice({ startDate, endDate, shipId })
	return json({ startDate, endDate, shipId, totalPrice })
}

export async function action({ request }: DataFunctionArgs) {
	const userId = await requireUserId(request)
	const formData = await request.formData()
	const result = validateBookerForm(formData)
	if (!result.ok) {
		return json(
			{ type: 'error', errors: result.errors },
			{
				status: 400,
			},
		)
	}
	const { startDate, endDate, shipId } = result.data
	const isAvailable = await getIsShipAvailable({ shipId, startDate, endDate })
	if (!isAvailable) {
		return json(
			{ type: 'error', errors: 'Ship is not available' },
			{ status: 400 },
		)
	}
	const totalPrice = await calculateTotalPrice({ startDate, endDate, shipId })
	let renter = await prisma.renter.findUnique({
		where: { userId },
		select: { userId: true },
	})

	// if they don't have a renter profile yet, let's just make one for them
	if (!renter) {
		renter = await prisma.renter.create({ data: { userId } })
	}

	const booking = await prisma.booking.create({
		data: {
			startDate,
			endDate,
			shipId,
			renterId: userId,
			totalPrice,
		},
	})

	const session = await getSession(request.headers.get('cookie'))
	session.unset(bookingSessionKey)

	return redirect(`/bookings/${booking.id}`, {
		headers: { 'Set-Cookie': await commitSession(session) },
	})
}

export default function ShipBookRoute() {
	const user = useOptionalUser()
	const data = useLoaderData<typeof loader>()
	const actionData = useActionData<typeof action>()
	const isError = actionData?.type === 'error'
	if (isError) {
		return (
			<div>
				There was an error, please <Link to="..">try again</Link>
			</div>
		)
	}
	return (
		<div>
			{user ? (
				<Form method="post">
					<input type="hidden" name="shipId" value={data.shipId} />
					<input type="hidden" name="startDate" value={data.startDate} />
					<input type="hidden" name="endDate" value={data.endDate} />
					<p>
						<strong>Start Date:</strong> {data.startDate}
					</p>
					<p>
						<strong>End Date:</strong> {data.endDate}
					</p>
					<p>
						<strong>Total Price:</strong> {data.totalPrice}
					</p>
					{/* TODO: add pricing */}
					<button type="submit" disabled={!user}>
						Confirm
					</button>
				</Form>
			) : (
				<InlineLogin />
			)}
			<Link to="..">Cancel</Link>
		</div>
	)
}

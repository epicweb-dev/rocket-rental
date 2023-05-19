import { json, type DataFunctionArgs } from '@remix-run/node'
import { useFetcher } from '@remix-run/react'
import * as df from 'date-fns'
import invariant from 'tiny-invariant'
import { prisma } from '~/utils/db.server.ts'
import { commitSession, getSession } from '~/utils/session.server.ts'

export const bookingSessionKey = 'bookingRange'

export async function getIsShipAvailable({
	shipId,
	startDate,
	endDate,
}: {
	shipId: string
	startDate: Date
	endDate: Date
}) {
	const booking = await prisma.booking.findFirst({
		select: { id: true },
		where: { shipId, startDate: { lte: endDate }, endDate: { gte: startDate } },
	})
	return !booking
}

function validateFutureDate(date: Date) {
	if (!df.isValid(date)) return 'Invalid date'
	if (df.isPast(date)) return 'Date must be in the future'
	return null
}

function validateEndDate({
	startDate,
	endDate,
}: {
	startDate: Date
	endDate: Date
}) {
	const futureDateError = validateFutureDate(endDate)
	if (futureDateError) return futureDateError
	if (df.differenceInDays(endDate, startDate) < 1)
		return 'End date must be after start date'
	return null
}

export function validateBookerForm(formData: FormData) {
	const {
		shipId,
		startDate: startDateString,
		endDate: endDateString,
	} = Object.fromEntries(formData)

	invariant(typeof shipId === 'string', 'shipId type invalid')
	invariant(typeof startDateString === 'string', 'startDate type invalid')
	invariant(typeof endDateString === 'string', 'endDate type invalid')

	const startDate = df.parseISO(startDateString)
	const endDate = df.parseISO(endDateString)

	const errors = {
		startDate: validateFutureDate(startDate),
		endDate: validateEndDate({ startDate, endDate }),
	}

	const hasErrors = Object.values(errors).some(Boolean)
	return hasErrors
		? ({ ok: false, errors } as const)
		: { ok: true, data: { shipId, startDate, endDate } as const }
}

export async function action({ request }: DataFunctionArgs) {
	const formData = await request.formData()

	const result = validateBookerForm(formData)
	if (!result.ok) {
		return json(
			{ status: 'error', errors: result.errors, isAvailable: false },
			{ status: 400 },
		)
	}
	const { shipId, startDate, endDate } = result.data
	const session = await getSession(request.headers.get('cookie'))
	session.set(bookingSessionKey, { shipId, startDate, endDate })

	return json(
		{
			status: 'success',
			errors: null,
			isAvailable: await getIsShipAvailable({
				shipId,
				startDate,
				endDate,
			}),
		},
		{
			headers: { 'Set-Cookie': await commitSession(session) },
		},
	)
}

export function Booker({
	initialIsAvailable,
	initialStartDate,
	initialEndDate,
	shipId,
	errors,
}: {
	initialIsAvailable: boolean
	initialStartDate: string
	initialEndDate: string
	shipId: string
	errors: { startDate: string | null; endDate: string | null } | undefined
}) {
	const availabilityFetcher = useFetcher<typeof action>()
	const startDateError =
		availabilityFetcher.data?.errors?.startDate ?? errors?.startDate
	const endDateError =
		availabilityFetcher.data?.errors?.endDate ?? errors?.endDate

	const isAvailable =
		availabilityFetcher.data?.status === 'success'
			? availabilityFetcher.data.isAvailable
			: initialIsAvailable

	function handleRangeChange(event: React.ChangeEvent<HTMLInputElement>) {
		invariant(
			event.currentTarget.form,
			'form element is required around Booker component',
		)
		const startDateInput =
			event.currentTarget.form.elements.namedItem('startDate')
		const endDateInput = event.currentTarget.form.elements.namedItem('endDate')
		if (!(startDateInput instanceof HTMLInputElement)) return
		if (!(endDateInput instanceof HTMLInputElement)) return
		availabilityFetcher.submit(
			{
				shipId,
				startDate: startDateInput.value,
				endDate: endDateInput.value,
			},
			{
				method: 'POST',
				action: '/resources/booker',
			},
		)
	}

	return (
		<div>
			<div>
				<label>
					<span>Trip Start Date</span>
					<input
						type="date"
						name="startDate"
						defaultValue={initialStartDate}
						onChange={handleRangeChange}
						required
						aria-describedby={startDateError ? 'start-date-error' : undefined}
						aria-invalid={startDateError ? true : undefined}
					/>
					{startDateError ? (
						<span className="pt-1 text-red-700" id="start-date-error">
							{startDateError}
						</span>
					) : null}
				</label>
			</div>
			<div>
				<label>
					<span>Trip End Date</span>
					<input
						type="date"
						name="endDate"
						defaultValue={initialEndDate}
						onChange={handleRangeChange}
						required
						aria-describedby={endDateError ? 'end-date-error' : undefined}
						aria-invalid={endDateError ? true : undefined}
					/>
				</label>
				{endDateError ? (
					<span className="pt-1 text-red-700" id="end-date-error">
						{endDateError}
					</span>
				) : null}
			</div>
			<input type="hidden" name="shipId" value={shipId} />
			<div>
				{availabilityFetcher.state !== 'idle'
					? '...'
					: isAvailable
					? 'Available'
					: 'Unavailable'}
			</div>
			<button type="submit" disabled={!isAvailable}>
				Book
			</button>
		</div>
	)
}

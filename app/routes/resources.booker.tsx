import { useFetcher } from '@remix-run/react'
import * as df from 'date-fns'
import type { ActionArgs } from '@remix-run/node'
import { json } from '@remix-run/node'
import { prisma } from '~/db.server'
import type { ErrorMessages, FormValidations } from 'remix-validity-state'
import { FormContextProvider, useValidatedInput } from 'remix-validity-state'
import { validateServerFormData } from 'remix-validity-state'
import { constrain } from '~/utils/misc'

const formValidations = constrain<FormValidations>()({
	shipId: {
		type: 'text',
		required: true,
	},
	startDate: {
		type: 'date',
		required: true,
	},
	endDate: {
		type: 'date',
		required: true,
	},
})

const errorMessages = constrain<ErrorMessages>()({
	valueMissing: (_, name) => `The ${name} field is required`,
	typeMismatch: (_, name) => `The ${name} field is invalid`,
})

export async function action({ request }: ActionArgs) {
	const formData = await request.formData()

	const serverFormInfo = await validateServerFormData(formData, formValidations)
	if (!serverFormInfo.valid) {
		return json({ type: 'error', serverFormInfo }, { status: 400 })
	}
	const { startDate, endDate, shipId } = serverFormInfo.submittedFormData
	// parse YYYY-MM-DD to Date
	const start = df.parseISO(startDate)
	const end = df.parseISO(endDate)
	console.log({ startDate, endDate, shipId })

	const booking = await prisma.booking.findFirst({
		where: {
			AND: [
				{ shipId },
				{ startDate: { lte: end } },
				{ endDate: { gte: start } },
			],
		},
	})

	return json({ type: 'success', isAvailable: !booking })
}

// TODO: once this is fixed then we can remove the silly wrapper Impl thing
// https://github.com/brophdawg11/remix-validity-state/issues/14
export function Booker(props: Parameters<typeof BookerImpl>[0]) {
	return (
		<FormContextProvider value={{ formValidations, errorMessages }}>
			<BookerImpl {...props} />
		</FormContextProvider>
	)
}

function BookerImpl({
	initialIsAvailable,
	initialStartDate,
	initialEndDate,
	shipId,
}: {
	initialIsAvailable: boolean
	initialStartDate: string
	initialEndDate: string
	shipId: string
}) {
	const bookingFetcher = useFetcher()
	const availabilityFetcher = useFetcher()
	const startDateField = useValidatedInput({
		name: 'startDate',
		formValidations,
		errorMessages,
		serverFormInfo: availabilityFetcher.data?.serverFormInfo,
	})
	const endDateField = useValidatedInput({
		name: 'endDate',
		formValidations,
		errorMessages,
		serverFormInfo: availabilityFetcher.data?.serverFormInfo,
	})

	const isAvailable = availabilityFetcher.data
		? availabilityFetcher.data.isAvailable
		: initialIsAvailable

	function handleRangeChange(event: React.ChangeEvent<HTMLInputElement>) {
		const startDateInput =
			event.currentTarget.form?.elements.namedItem('startDate')
		const endDateInput = event.currentTarget.form?.elements.namedItem('endDate')
		if (!(startDateInput instanceof HTMLInputElement)) return
		if (!(endDateInput instanceof HTMLInputElement)) return
		availabilityFetcher.submit(
			{
				shipId,
				startDate: startDateInput.value,
				endDate: endDateInput.value,
			},
			{
				method: 'post',
				action: '/resources/booker',
			},
		)
	}

	return (
		<bookingFetcher.Form>
			<input type="hidden" name="shipId" value={shipId} />
			<label>
				<span>Trip Start Date</span>
				<input
					{...startDateField.getInputAttrs({
						defaultValue: initialStartDate,
						onChange: handleRangeChange,
					})}
				/>
			</label>
			<label>
				<span>Trip End Date</span>
				<input
					{...endDateField.getInputAttrs({
						defaultValue: initialEndDate,
						onChange: handleRangeChange,
					})}
				/>
			</label>
			{availabilityFetcher.state !== 'idle'
				? '...'
				: isAvailable
				? 'Available'
				: 'Unavailable'}
			<button type="submit">Book</button>
		</bookingFetcher.Form>
	)
}

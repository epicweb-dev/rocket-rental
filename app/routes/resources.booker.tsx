import { useFetcher } from '@remix-run/react'
import * as df from 'date-fns'
import type { ActionArgs } from '@remix-run/node'
import { json } from '@remix-run/node'
import type { ServerFormInfo } from 'remix-validity-state'
import { FormContextProvider, useValidatedInput } from 'remix-validity-state'
import { ListOfErrorMessages } from '~/components'
import {
	getIsShipAvailable,
	validateBookerForm,
	formValidations,
	errorMessages,
} from '~/utils/booker'
import invariant from 'tiny-invariant'

export async function action({ request }: ActionArgs) {
	const formData = await request.formData()

	const serverFormInfo = await validateBookerForm(formData)
	if (!serverFormInfo.valid) {
		return json({ type: 'error', serverFormInfo }, { status: 400 })
	}
	const { startDate, endDate, shipId } = serverFormInfo.submittedFormData

	return json({
		type: 'success',
		isAvailable: await getIsShipAvailable({
			shipId,
			startDate: df.parseISO(startDate),
			endDate: df.parseISO(endDate),
		}),
	})
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
	serverFormInfo,
}: {
	initialIsAvailable: boolean
	initialStartDate: string
	initialEndDate: string
	shipId: string
	serverFormInfo: ServerFormInfo | null
}) {
	const availabilityFetcher = useFetcher()
	const startDateField = useValidatedInput({
		name: 'startDate',
		formValidations,
		errorMessages,
		serverFormInfo: serverFormInfo ?? availabilityFetcher.data?.serverFormInfo,
	})
	const endDateField = useValidatedInput({
		name: 'endDate',
		formValidations,
		errorMessages,
		serverFormInfo: serverFormInfo ?? availabilityFetcher.data?.serverFormInfo,
	})

	const isAvailable = availabilityFetcher.data
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
				method: 'post',
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
						{...startDateField.getInputAttrs({
							defaultValue: initialStartDate,
							onChange: handleRangeChange,
						})}
					/>
				</label>
				<ListOfErrorMessages info={startDateField.info} />
			</div>
			<div>
				<label>
					<span>Trip End Date</span>
					<input
						{...endDateField.getInputAttrs({
							defaultValue: initialEndDate,
							onChange: handleRangeChange,
						})}
					/>
				</label>
				<ListOfErrorMessages info={endDateField.info} />
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

import type { ErrorMessages, FormValidations } from 'remix-validity-state'
import { validateServerFormData } from 'remix-validity-state'
import { prisma } from '~/db.server'
import { constrain } from './misc'
import * as df from 'date-fns'

export const bookingSessionKey = 'booking'

export const formValidations = constrain<FormValidations>()({
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

export const errorMessages = constrain<ErrorMessages>()({
	valueMissing: () => `This field is required`,
	typeMismatch: () => `This field is invalid`,
	dateInFuture: () => `This field must be in the future`,
	endAfterStart: () => `The end date must be after the start date`,
})

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

export async function validateBookerForm(formData: FormData) {
	const serverFormInfo = await validateServerFormData(formData, {
		...formValidations,
		startDate: {
			...formValidations.startDate,
			dateInFuture: () => {
				const startDate = df.parseISO(String(formData.get('startDate')))
				if (startDate instanceof Date) {
					return df.isFuture(startDate)
				}
				return false
			},
		},
		endDate: {
			...formValidations.startDate,
			dateInFuture: () => {
				const endDate = df.parseISO(String(formData.get('endDate')))
				if (endDate instanceof Date) {
					return df.isFuture(endDate)
				}
				return false
			},
			endAfterStart: () => {
				const startDate = df.parseISO(String(formData.get('startDate')))
				const endDate = df.parseISO(String(formData.get('endDate')))
				return df.differenceInDays(endDate, startDate) > 0
			},
		},
	})
	return serverFormInfo
}

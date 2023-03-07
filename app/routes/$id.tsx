import { redirect, type DataFunctionArgs } from '@remix-run/node'
import invariant from 'tiny-invariant'
import { prisma } from '~/utils/db.server'

export async function loader({ params }: DataFunctionArgs) {
	invariant(params.id, 'Missing id')
	const user = await prisma.user.findUnique({
		where: { id: params.id },
		select: { username: true },
	})
	if (user) return redirect(`/users/${user.username}`)

	const ship = await prisma.ship.findUnique({
		where: { id: params.id },
		select: { id: true },
	})
	if (ship) return redirect(`/ships/${ship.id}`)

	const starport = await prisma.starport.findUnique({
		where: { id: params.id },
		select: { id: true },
	})
	if (starport) return redirect(`/starports/${starport.id}`)

	const shipModel = await prisma.shipModel.findUnique({
		where: { id: params.id },
		select: { id: true },
	})
	if (shipModel) return redirect(`/models/${shipModel.id}`)

	const shipBrand = await prisma.shipBrand.findUnique({
		where: { id: params.id },
		select: { id: true },
	})
	if (shipBrand) return redirect(`/brands/${shipBrand.id}`)

	const chat = await prisma.chat.findUnique({
		where: { id: params.id },
		select: { id: true },
	})
	if (chat) return redirect(`/chats/${chat.id}`)

	const booking = await prisma.booking.findUnique({
		where: { id: params.id },
		select: { id: true },
	})
	if (booking) return redirect(`/bookings/${booking.id}`)

	return redirect('/')
}

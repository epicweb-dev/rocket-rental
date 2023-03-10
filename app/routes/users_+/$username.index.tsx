import { DataFunctionArgs, redirect } from '@remix-run/node'
import { json } from '@remix-run/node'
import { Link, useCatch, useLoaderData } from '@remix-run/react'
import invariant from 'tiny-invariant'
import { Spacer } from '~/components/spacer'
import { prisma } from '~/utils/db.server'
import { getUserImgSrc, useOptionalUser } from '~/utils/misc'

export async function loader({ request, params }: DataFunctionArgs) {
	invariant(params.username, 'Missing username')
	const user = await prisma.user.findUnique({
		where: { username: params.username },
		select: {
			id: true,
			username: true,
			name: true,
			imageId: true,
			createdAt: true,
			host: { select: { userId: true } },
			renter: { select: { userId: true } },
		},
	})
	if (!user) {
		throw new Response('not found', { status: 404 })
	}
	if (user.host) {
		throw redirect(`/users/${params.username}/host`)
	}
	if (user.renter) {
		throw redirect(`/users/${params.username}/renter`)
	}
	return json({ user, userJoinedDisplay: user.createdAt.toLocaleDateString() })
}

export default function UsernameIndex() {
	const data = useLoaderData<typeof loader>()
	const loggedInUser = useOptionalUser()
	const isLoggedInUser = data.user.id === loggedInUser?.id

	return (
		<div className="container flex flex-col items-center justify-center">
			<img
				className="h-52 w-52 rounded-full object-cover"
				alt={data.user.name ?? data.user.username}
				src={getUserImgSrc(data.user.imageId)}
			/>
			<h1 className="text-4xl font-bold text-white">
				{data.user.name ?? data.user.username}
			</h1>
			<p className="text-gray-500">Joined {data.userJoinedDisplay}</p>
			<Spacer size="4xs" />
			{isLoggedInUser ? (
				<Link
					to="/settings/profile"
					className="rounded-full border border-night-lite py-5 px-10 text-white"
				>
					✏️ Create your profile
				</Link>
			) : (
				<p className="text-xs text-gray-500">
					This user does not have a renter or host profile yet.
				</p>
			)}
		</div>
	)
}

export function CatchBoundary() {
	const caught = useCatch()

	if (caught.status === 404) {
		return <div>Not user found</div>
	}

	throw new Error(`Unexpected caught response with status: ${caught.status}`)
}

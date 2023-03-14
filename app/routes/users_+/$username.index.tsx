import { DataFunctionArgs, json, redirect } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import { V2_MetaFunction } from '@remix-run/server-runtime'
import invariant from 'tiny-invariant'
import { GeneralErrorBoundary } from '~/components/error-boundary'
import { Spacer } from '~/components/spacer'
import { prisma } from '~/utils/db.server'
import { getUserImgSrc, useOptionalUser } from '~/utils/misc'

export async function loader({ params }: DataFunctionArgs) {
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
		<div className="container mx-auto flex flex-col items-center justify-center">
			<img
				className="h-52 w-52 rounded-full object-cover"
				alt={data.user.name ?? data.user.username}
				src={getUserImgSrc(data.user.imageId)}
			/>
			<h1 className="text-h2">{data.user.name ?? data.user.username}</h1>
			<p className="text-night-200">Joined {data.userJoinedDisplay}</p>
			<Spacer size="4xs" />
			{isLoggedInUser ? (
				<Link
					to="/settings/profile"
					className="rounded-full border border-night-400 py-5 px-10"
				>
					✏️ Create your profile
				</Link>
			) : (
				<p className="text-body-2xs text-night-200">
					This user does not have a renter or host profile yet.
				</p>
			)}
		</div>
	)
}

export function ErrorBoundary() {
	return (
		<GeneralErrorBoundary
			statusHandlers={{
				404: ({ params }) => (
					<p>No user with the username "{params.username}" exists</p>
				),
			}}
		/>
	)
}

export const meta: V2_MetaFunction<typeof loader> = ({ data }) => {
	const displayName = data.user.name ?? data.user.username
	return [
		{ title: `${displayName} | Rocket Rental` },
		{
			name: 'description',
			content: `${displayName} on Rocket Rental is not a host or renter yet.`,
		},
	]
}

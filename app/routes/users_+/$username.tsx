import { Tab, TabList, TabPanel, TabPanels, Tabs } from '@reach/tabs'
import type { DataFunctionArgs } from '@remix-run/node'
import { redirect } from '@remix-run/node'
import { json } from '@remix-run/node'
import {
	Form,
	Link,
	Outlet,
	useCatch,
	useLoaderData,
	useMatches,
	useNavigate,
	useParams,
} from '@remix-run/react'
import invariant from 'tiny-invariant'
import { prisma } from '~/utils/db.server'
import { getUserId, requireUserId } from '~/utils/auth.server'
import { useOptionalUser } from '~/utils/misc'

export async function loader({ params, request }: DataFunctionArgs) {
	const loggedInUser = await getUserId(request)
	invariant(params.username, 'Missing username')
	const user = await prisma.user.findUnique({
		where: { username: params.username },
		select: {
			id: true,
			username: true,
			name: true,
			imageUrl: true,
			contactInfo: {
				select: {
					city: true,
					zip: true,
					state: true,
					country: true,
				},
			},
			createdAt: true,
			chats: loggedInUser
				? {
						where: {
							users: {
								some: {
									id: { equals: loggedInUser },
								},
							},
						},
						select: {
							id: true,
							users: {
								select: {
									id: true,
									username: true,
								},
							},
						},
				  }
				: false,
		},
	})
	if (!user) {
		throw new Response('not found', { status: 404 })
	}
	return json({ user })
}

export async function action({ request, params }: DataFunctionArgs) {
	const loggedInUserId = await requireUserId(request)
	invariant(params.username, 'Missing username')
	const formData = await request.formData()
	const { intent } = Object.fromEntries(formData)
	switch (intent) {
		case 'create-chat': {
			const currentUser = await prisma.user.findUnique({
				where: { username: params.username },
				select: { id: true },
			})
			invariant(
				currentUser,
				`Cannot create chat with user that does not exist.`,
			)

			const existingChat = await prisma.chat.findFirst({
				where: {
					AND: [
						{ users: { some: { id: loggedInUserId } } },
						{ users: { some: { id: currentUser.id } } },
					],
				},
				select: { id: true },
			})
			if (existingChat) {
				return redirect(`/chats/${existingChat.id}`)
			}

			const createdChat = await prisma.chat.create({
				select: { id: true },
				data: {
					users: {
						connect: [{ id: loggedInUserId }, { id: currentUser.id }],
					},
				},
			})
			return redirect(`/chats/${createdChat.id}`)
		}
		default: {
			throw new Error(`Unsupported intent: ${intent}`)
		}
	}
}

export default function UserRoute() {
	const data = useLoaderData<typeof loader>()
	const loggedInUser = useOptionalUser()
	const navigate = useNavigate()
	const isOwnProfile = loggedInUser?.id === data.user.id
	const matches = useMatches()
	const lastMatch = matches[matches.length - 1]
	const onHostTab = lastMatch.id.endsWith('host')
	const onRenterTab = lastMatch.id.endsWith('renter')
	const tabIndex = onHostTab ? 0 : onRenterTab ? 1 : -1

	// TODO: figure out why the types are wrong here
	const oneOnOneChat = loggedInUser
		? data.user.chats.find(
				c =>
					// @ts-expect-error who knows
					c.users.length === 2 &&
					// @ts-expect-error who knows
					c.users.every(
						// @ts-expect-error who knows
						u => u.id === loggedInUser?.id || u.id === data.user.id,
					),
		  )
		: null

	function handleTabChange(index: number) {
		navigate(index === 0 ? 'host' : 'renter')
	}

	return (
		<div>
			<h1>{data.user.name ?? data.user.username}</h1>
			{isOwnProfile ? (
				<>
					<Form action="/logout" method="post">
						<button className="flex items-center justify-center rounded-md bg-blue-500 px-4 py-3 font-medium text-white hover:bg-blue-600">
							Logout of {loggedInUser.name}
						</button>
					</Form>
					<Link to="/bookings">View Your Bookings</Link>
				</>
			) : null}
			{data.user.imageUrl ? (
				<img
					src={data.user.imageUrl}
					alt={data.user.name ?? data.user.username}
				/>
			) : null}
			{isOwnProfile ? (
				<div>
					<strong>Chats:</strong>
					{data.user.chats.map(c => (
						<Link key={c.id} to={`/chats/${c.id}`}>
							{/* @ts-expect-error who knows */}
							Chat {c.users.map(u => u.username).join(', ')}
						</Link>
					))}
				</div>
			) : oneOnOneChat ? (
				<Link to={`/chats/${oneOnOneChat.id}`}>Chat</Link>
			) : (
				<Form method="post">
					<button type="submit" name="intent" value="create-chat">
						Chat
					</button>
				</Form>
			)}
			<pre>{JSON.stringify(data, null, 2)}</pre>
			<hr />
			<Tabs index={tabIndex} onChange={handleTabChange}>
				<TabList>
					<Tab
						// Because we have a link right under the tab, we'll keep this off
						// the tab "tree" and rely on focusing/activating the link.
						tabIndex={-1}
					>
						<Link
							to="host"
							onClick={e => {
								if (e.metaKey) {
									e.stopPropagation()
								} else {
									e.preventDefault()
								}
							}}
						>
							Host
						</Link>
					</Tab>
					<Tab
						// Because we have a link right under the tab, we'll keep this off
						// the tab "tree" and rely on focusing/activating the link.
						tabIndex={-1}
					>
						<Link
							to="renter"
							onClick={e => {
								if (e.metaKey) {
									e.stopPropagation()
								} else {
									e.preventDefault()
								}
							}}
						>
							Renter
						</Link>
					</Tab>
				</TabList>
				<TabPanels>
					<TabPanel>{tabIndex === 0 ? <Outlet /> : null}</TabPanel>
					<TabPanel>{tabIndex === 1 ? <Outlet /> : null}</TabPanel>
				</TabPanels>
			</Tabs>
		</div>
	)
}

export function CatchBoundary() {
	const caught = useCatch()
	const params = useParams()

	if (caught.status === 404) {
		return <div>User "{params.username}" not found</div>
	}

	throw new Error(`Unexpected caught response with status: ${caught.status}`)
}

export function ErrorBoundary({ error }: { error: Error }) {
	console.error(error)

	return <div>An unexpected error occurred: {error.message}</div>
}

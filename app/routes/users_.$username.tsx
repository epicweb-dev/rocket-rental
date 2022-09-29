import { Tab, TabList, TabPanel, TabPanels, Tabs } from '@reach/tabs'
import type { LoaderArgs } from '@remix-run/node'
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
import { prisma } from '~/db.server'
import { getUserId } from '~/services/auth.server'
import { useOptionalUser } from '~/utils/misc'

export async function loader({ params, request }: LoaderArgs) {
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
				  }
				: false,
		},
	})
	if (!user) {
		throw new Response('not found', { status: 404 })
	}
	return json({ user })
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

	function handleTabChange(index: number) {
		navigate(index === 0 ? 'host' : 'renter')
	}

	return (
		<div>
			<h1>{data.user.name ?? data.user.username}</h1>
			{isOwnProfile ? (
				<Form action="/logout" method="post">
					<button className="flex items-center justify-center rounded-md bg-blue-500 px-4 py-3 font-medium text-white hover:bg-blue-600">
						Logout of {loggedInUser.name}
					</button>
				</Form>
			) : null}
			{data.user.imageUrl ? (
				<img
					src={data.user.imageUrl}
					alt={data.user.name ?? data.user.username}
				/>
			) : null}
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
					<TabPanel>
						<Outlet />
					</TabPanel>
					<TabPanel>
						<Outlet />
					</TabPanel>
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

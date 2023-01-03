import { Link } from '@remix-run/react'
import { type V2_MetaFunction } from '@remix-run/node'
import { useOptionalUser } from '~/utils/misc'

export const meta: V2_MetaFunction = ({ matches }) => {
	return matches.find(match => match.route.id === 'root')?.meta ?? []
}

export default function Index() {
	const user = useOptionalUser()
	return (
		<main>
			<nav>
				<ul>
					<li>
						<Link to="search">Search</Link>
					</li>
					<li>
						<Link to="starports">Starports</Link>
					</li>
					<li>
						<Link to="ships">Ships</Link>
					</li>
					<li>
						<Link to="about">About</Link>
					</li>
					<li>
						<Link to="privacy">Privacy</Link>
					</li>
					<li>
						<Link to="code-of-conduct">Code of Conduct</Link>
					</li>
					<li>
						{user ? (
							<Link to="me">{user.name}</Link>
						) : (
							<Link
								to="/login"
								className="flex items-center justify-center rounded-md bg-blue-500 px-4 py-3 font-medium text-white hover:bg-blue-600"
							>
								Log In
							</Link>
						)}
					</li>
				</ul>
			</nav>
		</main>
	)
}

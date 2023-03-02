import { Link } from '@remix-run/react'
import { type V2_MetaFunction } from '@remix-run/node'
import { useOptionalUser } from '~/utils/misc'

export const meta: V2_MetaFunction = ({ matches }) => {
	return matches.find(match => match.route.id === 'root')?.meta ?? []
}

export default function Index() {
	const user = useOptionalUser()
	return (
		<>
			<header className="mx-auto max-w-7xl py-6">
				<nav className="flex justify-between">
					<Link to="/" className="text-white">
						Rocket Rental
					</Link>
					<div className="flex items-center gap-10">
						<Link to="/search" className="text-white">
							Search
						</Link>
						{user ? (
							<Link to="me" className="text-white">
								{user.name}
							</Link>
						) : (
							<Link
								to="/login"
								className="rounded-full bg-primary py-3.5 px-10 text-sm font-bold text-white hover:bg-primary-darker"
							>
								Log In
							</Link>
						)}
					</div>
				</nav>
			</header>

			<main className="mt-44">
				<div className="mx-auto max-w-3xl text-center">
					<p className="text-2xl text-white/70">Explore the universe</p>
					<h1 className="text-7.5xl tracking-wide text-white">
						Rent a space rocket in two clicks!
					</h1>
				</div>
				<div className="my-64"></div>
				<Marquee />
			</main>
		</>
	)
}

function Marquee() {
	const children = (
		<>
			<li className="shrink-0">
				Esse consequat consectetur excepteur esse laborum amet
			</li>
			<li className="shrink-0">
				Consequat ipsum ad ullamco duis voluptate deserunt reprehenderit
			</li>
			<li className="shrink-0">
				Duis occaecat proident velit eu excepteur adipisicing ea et
			</li>
			<li className="shrink-0">
				Exercitation laborum laborum laboris laborum.
			</li>
		</>
	)
	const ulClassName = 'flex shrink-0 animate-marquee gap-8 pl-8'
	return (
		<div className="-mx-2 flex rotate-[-4deg] overflow-x-hidden border-t-2 border-b-2 border-t-pink-500 border-b-primary py-2 text-white">
			<ul className={ulClassName}>{children}</ul>
			<ul className={ulClassName} aria-hidden={true}>
				{children}
			</ul>
		</div>
	)
}

function Spacer({ size }: { size: 'sm' | 'md' | 'lg' }) {
	const options: Record<typeof size, string> = {
		sm: 'h-4',
		md: 'h-8',
		lg: 'h-12',
	}
	const className = options[size]
	return <div className={className} />
}

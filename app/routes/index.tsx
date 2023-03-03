import { Form, Link } from '@remix-run/react'
import { type V2_MetaFunction } from '@remix-run/node'
import { useOptionalUser } from '~/utils/misc'
import { useState } from 'react'

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
						<div className="font-light">rocket</div>
						<div className="font-bold">Rental</div>
					</Link>
					<div className="flex items-center gap-10">
						<Link to="/search" className="text-white">
							🔍
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

			<Spacer size="4xl" />
			<main>
				<div className="mx-auto max-w-3xl text-center">
					<p className="text-2xl text-white/70">Explore the universe</p>
					<h1 className="text-7.5xl tracking-wide text-white">
						Rent a space rocket in two clicks!
					</h1>
				</div>
				<Spacer size="lg" />
				<Form
					method="get"
					action="/search"
					className="mx-auto flex h-20 w-[80vw] max-w-5xl items-center rounded-full bg-white py-5"
				>
					{/* TODO: make these use comboboxes so they actually work */}
					<div className="flex h-full flex-1 flex-col gap-1 px-8">
						<label className="text-xs" htmlFor="starport">
							Starport
						</label>
						<input
							id="starport"
							name="starport"
							type="text"
							placeholder="Choose Starport"
							className="w-full"
						/>
					</div>
					<div className="flex h-full flex-1 flex-col gap-1 border-l-[1px] border-gray-200 px-8">
						<label className="text-xs" htmlFor="city">
							City
						</label>
						<input
							id="city"
							name="city"
							type="text"
							placeholder="Choose city"
							className="w-full"
						/>
					</div>
					<div className="flex h-full flex-1 flex-col gap-1 border-l-[1px] border-gray-200 px-8">
						<label className="text-xs" htmlFor="brand">
							Brand
						</label>
						<input
							id="brand"
							name="brand"
							type="text"
							placeholder="Choose brand"
							className="w-full"
						/>
					</div>
					<div className="flex h-full flex-1 flex-col gap-1 border-l-[1px] border-gray-200 px-8">
						<label className="text-xs" htmlFor="host">
							Host
						</label>
						<input
							id="host"
							name="host"
							type="text"
							placeholder="Choose host"
							className="w-full"
						/>
					</div>
					<div className="shrink-0">
						<button
							type="submit"
							className="m-3 h-16 w-16 rounded-full bg-primary text-white hover:bg-primary-darker"
						>
							🔍
						</button>
					</div>
				</Form>
				<BigSpacer />
				<div className="mx-auto w-full text-center text-gray-500">
					scroll 👇
				</div>
				<BigSpacer />
				<div className="container mx-auto">
					<div className="grid grid-cols-2 gap-36">
						<div className="flex flex-col gap-14">
							<div className="flex flex-col gap-6">
								<h2 className="text-6xl font-bold text-white">
									Largest selection of high-speed rockets in the galaxy
								</h2>
								<p className="w-[76%] text-xl text-gray-500">
									Find your favorite brand of rocket from your favorite rocket
									host, then pack your bags and book your next intergalactic
									trip today!
								</p>
							</div>
							<div>
								<Link
									to="/search"
									className="rounded-full bg-primary py-3.5 px-10 text-sm font-bold text-white hover:bg-primary-darker"
								>
									Explore rockets
								</Link>
							</div>
						</div>
						<div>SPACESHIP IMAGE</div>
					</div>
				</div>
				<BigSpacer />
				<div className="container mx-auto">
					<div className="mx-auto flex max-w-xl flex-col gap-4 text-center">
						<h2 className="text-6xl font-bold text-white">How it works</h2>
						<p className="text-xl text-gray-500">
							At Rocket Rental, we bring people who have rockets and people who
							need rockets together so anyone can explore the stars.
						</p>
					</div>
				</div>
				<Spacer size="sm" />
				<div className="container mx-auto">
					<div className="grid grid-cols-3 gap-6">
						<div className="flex h-96 flex-col justify-between rounded-3xl bg-[#1E1E20] p-10">
							<div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary">
								📡
							</div>
							<div className="flex flex-col gap-7">
								<div className="text-xl text-gray-500">01</div>
								<p className="text-3xl text-white">Find your dream rocket</p>
							</div>
						</div>
						<div className="flex h-96 flex-col justify-between rounded-3xl bg-[#1E1E20] p-10">
							<div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary">
								🚀
							</div>
							<div className="flex flex-col gap-7">
								<div className="text-xl text-gray-500">02</div>
								<p className="text-3xl text-white">
									Rent a rocket in two clicks
								</p>
							</div>
						</div>
						<div className="flex h-96 flex-col justify-between rounded-3xl bg-[#1E1E20] p-10">
							<div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary">
								✨
							</div>
							<div className="flex flex-col gap-7">
								<div className="text-xl text-gray-500">03</div>
								<p className="text-3xl text-white">
									Choose a destination and go on a journey
								</p>
							</div>
						</div>
					</div>
				</div>
				<BigSpacer />
				<StarportListSection />
				<Spacer size="lg" />
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

function StarportListSection() {
	const starports: Array<{
		name: string
		description: string
		imageSrc: string
	}> = [
		{
			name: 'Starport 1',
			description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
			imageSrc:
				'https://images.unsplash.com/photo-1614726365952-510103b1bbb4?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1674&q=80',
		},
		{
			name: 'Starport 2',
			description:
				'Lorem ipsum dolor sit amet, incididunt ut labore et dolore magna aliqua.',
			imageSrc:
				'https://images.unsplash.com/photo-1460186136353-977e9d6085a1?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1470&q=80',
		},
		{
			name: 'Starport 3',
			description:
				'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
			imageSrc:
				'https://images.unsplash.com/photo-1604111969833-dd2055a14090?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1634&q=80',
		},
		{
			name: 'Starport 4',
			description:
				'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
			imageSrc:
				'https://images.unsplash.com/photo-1518365050014-70fe7232897f?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=987&q=80',
		},
	]
	// TODO: animate the transition between starports
	const [index, setIndex] = useState(0)
	const next = () => setIndex((index + 1) % starports.length)
	const prev = () => setIndex((index - 1 + starports.length) % starports.length)
	const starportsToRender = starports
		.slice(index)
		.concat(starports.slice(0, index))
	return (
		<div className="container mx-auto">
			<div className="grid grid-cols-3">
				<div className="flex flex-col justify-between gap-14 border-r-2 border-r-gray-600 pr-10">
					<h2 className="text-5xl font-bold text-white">
						Many unique starports available
					</h2>
					<div>
						<button onClick={prev}>👈</button>
						<button onClick={next}>👉</button>
					</div>
				</div>
				<div className="col-span-2 flex gap-6 overflow-x-hidden py-7 pl-14">
					{starportsToRender.map(s => (
						<div
							key={s.name}
							className="flex max-w-[280px] shrink-0 flex-col rounded-3xl bg-[#1E1E20]"
						>
							<img className="aspect-[35/31] rounded-3xl" src={s.imageSrc} />
							<div className="h-10" />
							<div className="flex flex-col gap-2 px-6 pb-8">
								<h3 className="text-2xl font-bold text-white line-clamp-1">
									{s.name}
								</h3>
								<p className="text-base text-gray-500 line-clamp-2">
									{s.description}
								</p>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	)
}

function BigSpacer() {
	return <div className="h-[276px]" />
}

function Spacer({
	size,
}: {
	size:
		| '4xs'
		| '3xs'
		| '2xs'
		| 'xs'
		| 'sm'
		| 'md'
		| 'lg'
		| 'xl'
		| '2xl'
		| '3xl'
		| '4xl'
}) {
	const options: Record<typeof size, string> = {
		'4xs': 'h-4',
		'3xs': 'h-8',
		'2xs': 'h-12',
		xs: 'h-16',
		sm: 'h-20',
		md: 'h-24',
		lg: 'h-28',
		xl: 'h-32',
		'2xl': 'h-36',
		'3xl': 'h-40',
		'4xl': 'h-44',
	}
	const className = options[size]
	return <div className={className} />
}

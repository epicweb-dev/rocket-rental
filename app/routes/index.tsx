import * as Tabs from '@radix-ui/react-tabs'
import { type V2_MetaFunction } from '@remix-run/node'
import { Form, Link } from '@remix-run/react'
import clsx from 'clsx'
import { useRef, useState } from 'react'
import styles from './index.module.css'

export const meta: V2_MetaFunction = ({ matches }) => {
	return matches.find(match => match.route.id === 'root')?.meta ?? []
}

export default function Index() {
	return (
		<>
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
				<Spacer size="xl" />
				<div className="overflow-x-scroll py-20">
					<Marquee />
				</div>
				<Spacer size="4xl" />
				<div className="container mx-auto">
					<div className="grid grid-cols-2 gap-36">
						<div className="grid grid-cols-2 gap-6">
							<div className="flex flex-col gap-6">
								<div className="flex h-[160px] w-[216px] flex-col items-center justify-center gap-1 rounded-3xl bg-[#1E1E20]">
									<img className="aspect-square w-16" src="" />
									<span className="uppercase text-white">Zheng</span>
								</div>
								<div className="flex h-[160px] w-[216px] flex-col items-center justify-center gap-1 rounded-3xl bg-[#1E1E20]">
									<img className="aspect-square w-16" src="" />
									<span className="uppercase text-white">Oribtalis</span>
								</div>
								<div className="flex h-[160px] w-[216px] flex-col items-center justify-center gap-1 rounded-3xl bg-[#1E1E20]">
									<img className="aspect-square w-16" src="" />
									<span className="uppercase text-white">Cosmic</span>
								</div>
							</div>
							<div className="flex flex-col gap-6 pt-16">
								<div className="flex h-64 w-64 flex-col items-center justify-center gap-10 rounded-3xl bg-[#1E1E20]">
									<img className="aspect-square w-24" src="" />
									<span className="uppercase text-white">Asteroid</span>
								</div>
								<div className="flex h-64 w-64 flex-col items-center justify-center gap-10 rounded-3xl bg-[#1E1E20]">
									<img className="aspect-square w-24" src="" />
									<span className="uppercase text-white">Spaceship</span>
								</div>
							</div>
						</div>
						<div className="flex flex-col gap-14 pt-32">
							<div className="flex flex-col gap-6">
								<h2 className="text-6xl font-bold text-white">
									We have only the best rocket brands!
								</h2>
								<p className="w-[76%] text-xl text-gray-500">
									Hosts on our platform can only list reputable brands of
									rockets - so you can be sure that you're getting the best
									rocket for your trip.
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
					</div>
				</div>
				<Spacer size="4xl" />
				<RocketModelsSection />
				<Spacer size="xl" />
				<div className="container mx-auto">
					<div className="text-center">
						<p className="text-base text-gray-500">Our advantages</p>
						<h2 className="mx-auto mt-4 max-w-4xl text-6xl font-bold tracking-wide text-white">
							Nobody's better at rockets than Rocket Rental
						</h2>
					</div>
					<Spacer size="sm" />
					<div className="flex items-center justify-center rounded-3xl bg-[#1E1E20] py-16">
						<div className="flex flex-1 flex-col items-center justify-center gap-1">
							<div
								className={clsx(
									'text-7.5xl',
									styles.statsNumber,
									styles.statsDistance,
								)}
							>
								876
							</div>
							<div className="text-center text-gray-500">light years flown</div>
						</div>
						<div className="flex flex-1 flex-col items-center justify-center gap-1 border-l-2 border-l-gray-500">
							<div
								className={clsx(
									'text-7.5xl',
									styles.statsNumber,
									styles.statsHosts,
								)}
							>
								2.5K
							</div>
							<div className="text-center text-gray-500">
								hosts on our platform
							</div>
						</div>
						<div className="flex flex-1 flex-col items-center justify-center gap-1 border-l-2 border-l-gray-500">
							<div
								className={clsx(
									'text-7.5xl',
									styles.statsNumber,
									styles.statsRockets,
								)}
							>
								16K
							</div>
							<div className="text-center text-gray-500">
								rockets available for rent
							</div>
						</div>
					</div>
					<Spacer size="3xs" />
					<div className="grid grid-cols-2">
						<div className="rounded-3xl">
							<img src="" alt="Beautiful close-up on a star" />
						</div>
						<div className="rounded-3xl bg-white py-12 px-14">
							<h3 className="text-5xl text-black">
								Buy reliable space travel insurance!
							</h3>
							<p className="mt-4 text-xl text-gray-500">
								Life happens. And sometimes, it can mess up your space travel
								plans. That's why we offer insurance for all or part of your
								trip to give you peace of mind.
							</p>
							<Link
								to="/insurance"
								className="mt-14 inline-block rounded-full bg-primary py-5 px-14 text-lg font-bold text-white hover:bg-primary-darker"
							>
								Learn more
							</Link>
						</div>
					</div>
				</div>
				<Spacer size="4xl" />
				<Testimonials />
				<BigSpacer />
				<BigSpacer />
				<div className="container mx-auto">
					<div className="mx-auto max-w-3xl text-center">
						<h2 className="text-6xl text-white">
							Travel to any planet in space on your favorite rocket.
						</h2>
						<Spacer size="xs" />
						<div>
							<Link
								to="/search"
								className="rounded-full bg-primary py-3.5 px-10 text-sm font-bold text-white hover:bg-primary-darker"
							>
								Explore rockets
							</Link>
						</div>
					</div>
				</div>
				<BigSpacer />
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
	// TODO: fix the scroll buttons
	const scrollRef = useRef<HTMLDivElement>(null)
	function scrollTo(delta: number) {
		if (!(scrollRef.current instanceof HTMLDivElement)) return

		const parentEl = scrollRef.current
		const scrollLeft = parentEl.scrollLeft

		// Loop through each child element
		let leftMostElFullyInView: HTMLElement | null = null
		for (let i = 0; i < parentEl.children.length; i++) {
			const childEl = parentEl.children[i]
			if (!(childEl instanceof HTMLElement)) continue

			// Check if the child element is fully within view
			if (
				childEl.offsetLeft >= scrollLeft &&
				childEl.offsetLeft + childEl.offsetWidth <=
					scrollLeft + parentEl.offsetWidth
			) {
				// This child element is fully within view
				leftMostElFullyInView = childEl
				break
			}
		}

		if (!leftMostElFullyInView) {
			console.warn('No element fully in view')
			return
		}
		let nextEl: HTMLElement | null = null
		if (delta < 0) {
			const prev = leftMostElFullyInView.previousSibling
			if (!(prev instanceof HTMLElement)) {
				console.warn('No previous element')
				return
			}
			nextEl = prev
		} else {
			const next = leftMostElFullyInView.nextSibling
			if (!(next instanceof HTMLElement)) {
				console.warn('No next element')
				return
			}
			nextEl = next
		}

		nextEl.scrollIntoView({
			behavior: 'smooth',
			block: 'nearest',
			inline: 'start',
		})
	}
	return (
		<div className="container mx-auto">
			<div className="grid grid-cols-3">
				<div className="flex flex-col justify-between gap-14 border-r-2 border-r-gray-600 pr-10">
					<h2 className="text-5xl font-bold text-white">
						Many unique starports available
					</h2>
					<div>
						<button
							className="rounded-full bg-primary p-6 text-3xl font-bold text-white"
							onClick={() => scrollTo(-1)}
						>
							👈
						</button>
						<button
							className="rounded-full bg-primary p-6 text-3xl font-bold text-white"
							onClick={() => scrollTo(1)}
						>
							👉
						</button>
					</div>
				</div>
				<div
					ref={scrollRef}
					className="hide-scrollbar relative col-span-2 flex overflow-x-scroll scroll-smooth py-7 pl-14"
				>
					{starports.map(s => (
						<div
							key={s.name}
							className="starport-card ml-6 flex max-w-[280px] shrink-0 flex-col rounded-3xl bg-[#1E1E20]"
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

function RocketModelsSection() {
	const [value, setValue] = useState('zheng')
	const triggerClassName = 'py-3 px-8 text-3xl'
	const inactiveTriggerClassName = 'text-gray-500 hover:text-white'
	const activeTriggerClassName =
		'rounded-full bg-primary hover:bg-primary-darker text-white'
	const models: Record<
		string,
		Array<{ name: string; description: string; imageSrc: string }>
	> = {
		zheng: [
			{
				name: 'Zheng 1',
				imageSrc: '',
				description:
					'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
			},
			{
				name: 'Zheng 2',
				imageSrc: '',
				description:
					'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
			},
			{
				name: 'Zheng 3',
				imageSrc: '',
				description:
					'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
			},
			{
				name: 'Zheng 4',
				imageSrc: '',
				description:
					'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
			},
			{
				name: 'Zheng 5',
				imageSrc: '',
				description:
					'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
			},
			{
				name: 'Zheng 6',
				imageSrc: '',
				description:
					'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
			},
		],
		orbitalis: [
			{
				name: 'Orbitalis 1',
				imageSrc: '',
				description:
					'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
			},
			{
				name: 'Orbitalis 2',
				imageSrc: '',
				description:
					'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
			},
			{
				name: 'Orbitalis 3',
				imageSrc: '',
				description:
					'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
			},
			{
				name: 'Orbitalis 4',
				imageSrc: '',
				description:
					'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
			},
			{
				name: 'Orbitalis 5',
				imageSrc: '',
				description:
					'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
			},
			{
				name: 'Orbitalis 6',
				imageSrc: '',
				description:
					'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
			},
		],
		spaceship: [
			{
				name: 'Spaceship 1',
				imageSrc: '',
				description:
					'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
			},
			{
				name: 'Spaceship 2',
				imageSrc: '',
				description:
					'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
			},
			{
				name: 'Spaceship 3',
				imageSrc: '',
				description:
					'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
			},
			{
				name: 'Spaceship 4',
				imageSrc: '',
				description:
					'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
			},
			{
				name: 'Spaceship 5',
				imageSrc: '',
				description:
					'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
			},
			{
				name: 'Spaceship 6',
				imageSrc: '',
				description:
					'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
			},
		],
		cosmic: [
			{
				name: 'Cosmic 1',
				imageSrc: '',
				description:
					'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
			},
			{
				name: 'Cosmic 2',
				imageSrc: '',
				description:
					'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
			},
			{
				name: 'Cosmic 3',
				imageSrc: '',
				description:
					'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
			},
			{
				name: 'Cosmic 4',
				imageSrc: '',
				description:
					'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
			},
			{
				name: 'Cosmic 5',
				imageSrc: '',
				description:
					'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
			},
			{
				name: 'Cosmic 6',
				imageSrc: '',
				description:
					'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
			},
		],
		asteroid: [
			{
				name: 'Asteroid 1',
				imageSrc: '',
				description:
					'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
			},
			{
				name: 'Asteroid 2',
				imageSrc: '',
				description:
					'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
			},
			{
				name: 'Asteroid 3',
				imageSrc: '',
				description:
					'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
			},
			{
				name: 'Asteroid 4',
				imageSrc: '',
				description:
					'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
			},
			{
				name: 'Asteroid 5',
				imageSrc: '',
				description:
					'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
			},
			{
				name: 'Asteroid 6',
				imageSrc: '',
				description:
					'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
			},
		],
	}
	return (
		<div className="container mx-auto">
			<p className="text-base text-gray-500">Best known</p>
			<Spacer size="4xs" />
			<h2 className="max-w-lg text-5xl font-bold text-white">
				A wide variety of rocket models
			</h2>
			<Spacer size="sm" />
			<Tabs.Root value={value} onValueChange={newValue => setValue(newValue)}>
				<Tabs.List className="flex gap-4">
					<Tabs.Trigger
						value="zheng"
						className={clsx(
							triggerClassName,
							value === 'zheng'
								? activeTriggerClassName
								: inactiveTriggerClassName,
						)}
					>
						Zheng
					</Tabs.Trigger>
					<Tabs.Trigger
						value="orbitalis"
						className={clsx(
							triggerClassName,
							value === 'orbitalis'
								? activeTriggerClassName
								: inactiveTriggerClassName,
						)}
					>
						Orbitalis
					</Tabs.Trigger>
					<Tabs.Trigger
						value="spaceship"
						className={clsx(
							triggerClassName,
							value === 'spaceship'
								? activeTriggerClassName
								: inactiveTriggerClassName,
						)}
					>
						Spaceship
					</Tabs.Trigger>
					<Tabs.Trigger
						value="cosmic"
						className={clsx(
							triggerClassName,
							value === 'cosmic'
								? activeTriggerClassName
								: inactiveTriggerClassName,
						)}
					>
						Cosmic
					</Tabs.Trigger>
					<Tabs.Trigger
						value="asteroid"
						className={clsx(
							triggerClassName,
							value === 'asteroid'
								? activeTriggerClassName
								: inactiveTriggerClassName,
						)}
					>
						Asteroid
					</Tabs.Trigger>
				</Tabs.List>
				<Spacer size="2xs" />
				<Tabs.Content className="grid grid-cols-3 gap-6" value="zheng">
					{models.zheng.map(ship => (
						<div
							key={ship.name}
							className="flex max-w-sm flex-col rounded-3xl bg-[#1E1E20]"
						>
							<img className="aspect-[35/31] rounded-3xl" src={ship.imageSrc} />
							<div className="h-10" />
							<div className="flex flex-col gap-2 px-6 pb-8">
								<h3 className="text-2xl font-bold text-white line-clamp-1">
									{ship.name}
								</h3>
								<p className="text-base text-gray-500 line-clamp-2">
									{ship.description}
								</p>
							</div>
						</div>
					))}
				</Tabs.Content>
				<Tabs.Content className="grid grid-cols-3 gap-6" value="orbitalis">
					{models.orbitalis.map(ship => (
						<div
							key={ship.name}
							className="flex max-w-sm flex-col rounded-3xl bg-[#1E1E20]"
						>
							<img className="aspect-[35/31] rounded-3xl" src={ship.imageSrc} />
							<div className="h-10" />
							<div className="flex flex-col gap-2 px-6 pb-8">
								<h3 className="text-2xl font-bold text-white line-clamp-1">
									{ship.name}
								</h3>
								<p className="text-base text-gray-500 line-clamp-2">
									{ship.description}
								</p>
							</div>
						</div>
					))}
				</Tabs.Content>
				<Tabs.Content className="grid grid-cols-3 gap-6" value="spaceship">
					{models.spaceship.map(ship => (
						<div
							key={ship.name}
							className="flex max-w-sm flex-col rounded-3xl bg-[#1E1E20]"
						>
							<img className="aspect-[35/31] rounded-3xl" src={ship.imageSrc} />
							<div className="h-10" />
							<div className="flex flex-col gap-2 px-6 pb-8">
								<h3 className="text-2xl font-bold text-white line-clamp-1">
									{ship.name}
								</h3>
								<p className="text-base text-gray-500 line-clamp-2">
									{ship.description}
								</p>
							</div>
						</div>
					))}
				</Tabs.Content>
				<Tabs.Content className="grid grid-cols-3 gap-6" value="cosmic">
					{models.cosmic.map(ship => (
						<div
							key={ship.name}
							className="flex max-w-sm flex-col rounded-3xl bg-[#1E1E20]"
						>
							<img className="aspect-[35/31] rounded-3xl" src={ship.imageSrc} />
							<div className="h-10" />
							<div className="flex flex-col gap-2 px-6 pb-8">
								<h3 className="text-2xl font-bold text-white line-clamp-1">
									{ship.name}
								</h3>
								<p className="text-base text-gray-500 line-clamp-2">
									{ship.description}
								</p>
							</div>
						</div>
					))}
				</Tabs.Content>
				<Tabs.Content className="grid grid-cols-3 gap-6" value="asteroid">
					{models.asteroid.map(ship => (
						<div
							key={ship.name}
							className="flex max-w-sm flex-col rounded-3xl bg-[#1E1E20]"
						>
							<img className="aspect-[35/31] rounded-3xl" src={ship.imageSrc} />
							<div className="h-10" />
							<div className="flex flex-col gap-2 px-6 pb-8">
								<h3 className="text-2xl font-bold text-white line-clamp-1">
									{ship.name}
								</h3>
								<p className="text-base text-gray-500 line-clamp-2">
									{ship.description}
								</p>
							</div>
						</div>
					))}
				</Tabs.Content>
			</Tabs.Root>
			<Spacer size="2xs" />
			<div className="mx-auto flex w-full justify-center">
				{/* TODO: link this to search with the selected brand */}
				<Link
					to="/search"
					className="rounded-full border-[1.5px] border-gray-700 px-14 py-5 text-white"
				>
					See all
				</Link>
			</div>
		</div>
	)
}

function Testimonials() {
	const testimonials: Array<{
		testimonial: string
		host: { imageSrc: string; name: string; subtitle: string }
	}> = [
		{
			testimonial:
				"I love the fact that I can rent out my ship when I'm not using it. It's a great way to make some extra money.",
			host: {
				imageSrc: 'https://randomuser.me/api/portraits/men/56.jpg',
				name: 'John Doe',
				subtitle: 'Orbitalis 3000',
			},
		},
		{
			testimonial:
				"I love the fact that I can rent out my ship when I'm not using it. It's a great way to make some extra money.",
			host: {
				imageSrc: 'https://randomuser.me/api/portraits/women/32.jpg',
				name: 'Jane Doe',
				subtitle: 'Spaceship 2500',
			},
		},
		{
			testimonial:
				"I love the fact that I can rent out my ship when I'm not using it. It's a great way to make some extra money.",
			host: {
				imageSrc: 'https://randomuser.me/api/portraits/women/36.jpg',
				name: 'Samantha Sweet',
				subtitle: 'Zheng 15',
			},
		},
		{
			testimonial:
				"I love the fact that I can rent out my ship when I'm not using it. It's a great way to make some extra money. I love the fact that I can rent out my ship when I'm not using it. It's a great way to make some extra money. I love the fact that I can rent out my ship when I'm not using it. It's a great way to make some extra money.",
			host: {
				imageSrc: 'https://randomuser.me/api/portraits/women/12.jpg',
				name: 'Brooke Ricardo',
				subtitle: 'Cosmic 999',
			},
		},
		{
			testimonial:
				"I love the fact that I can rent out my ship when I'm not using it. It's a great way to make some extra money.",
			host: {
				imageSrc: 'https://randomuser.me/api/portraits/men/16.jpg',
				name: 'Bobbo the Clown',
				subtitle: 'Asteroid 1000',
			},
		},
	]
	return (
		<>
			<div className="container mx-auto">
				<h2 className="max-w-sm text-6xl font-bold text-white">
					What our top hosts say
				</h2>
			</div>
			<Spacer size="sm" />
			<div className="hide-scrollbar relative flex gap-8 overflow-x-scroll">
				{testimonials.map(({ testimonial, host }) => (
					<div className="flex h-[320px] w-[440px] shrink-0 flex-col justify-between rounded-3xl border-[1px] border-gray-500 p-10">
						<p className="quote text-white line-clamp-5">{testimonial}</p>
						<div className="flex gap-4">
							<img className="h-14 w-14 rounded-full" src={host.imageSrc} />
							<div className="flex flex-col gap-1">
								<h3 className="text-base font-bold text-white">{host.name}</h3>
								<p className="text-sm text-gray-500">{host.subtitle}</p>
							</div>
						</div>
					</div>
				))}
			</div>
		</>
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

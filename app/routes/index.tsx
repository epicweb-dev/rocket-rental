import * as Tabs from '@radix-ui/react-tabs'
import { Form, Link } from '@remix-run/react'
import clsx from 'clsx'
import { useRef, useState } from 'react'
import { Spacer } from '~/components/spacer'
import { ButtonLink } from '~/utils/forms'
import styles from './index.module.css'

export default function Index() {
	return (
		<>
			<Spacer size="4xl" />
			<main>
				<div className="mx-auto max-w-3xl text-center">
					<p className="text-body-lg text-night-200">Explore the universe</p>
					<h1 className="text-mega tracking-wide">
						Find yourself in outer space
					</h1>
				</div>
				<Spacer size="lg" />
				<Form
					method="GET"
					action="/search"
					className="mx-auto flex h-20 w-[80vw] max-w-5xl items-center rounded-full bg-white py-5"
				>
					{/* TODO: make these use comboboxes so they actually work */}
					<div className="flex h-full flex-1 flex-col gap-1 px-8">
						<label className="text-body-2xs text-night-500" htmlFor="starport">
							Starport
						</label>
						<input
							id="starport"
							name="starport"
							type="text"
							placeholder="Choose Starport"
							className="w-full text-night-500"
						/>
					</div>
					<div className="flex h-full flex-1 flex-col gap-1 border-l-[1px] border-gray-200 px-8">
						<label className="text-body-2xs text-night-500" htmlFor="city">
							City
						</label>
						<input
							id="city"
							name="city"
							type="text"
							placeholder="Choose city"
							className="w-full text-night-500"
						/>
					</div>
					<div className="flex h-full flex-1 flex-col gap-1 border-l-[1px] border-gray-200 px-8">
						<label className="text-body-2xs text-night-500" htmlFor="brand">
							Brand
						</label>
						<input
							id="brand"
							name="brand"
							type="text"
							placeholder="Choose brand"
							className="w-full text-night-500"
						/>
					</div>
					<div className="flex h-full flex-1 flex-col gap-1 border-l-[1px] border-gray-200 px-8">
						<label className="text-body-2xs text-night-500" htmlFor="host">
							Host
						</label>
						<input
							id="host"
							name="host"
							type="text"
							placeholder="Choose host"
							className="w-full text-night-500"
						/>
					</div>
					<div className="shrink-0">
						<button
							type="submit"
							className="hover:bg-accent-purple-darker m-3 h-16 w-16 rounded-full bg-accent-purple"
						>
							🔍
						</button>
					</div>
				</Form>
				<BigSpacer />
				<div className="mx-auto w-full text-center text-night-200">
					scroll 👇
				</div>
				<BigSpacer />
				<div className="container mx-auto">
					<div className="grid grid-cols-2 gap-36">
						<div className="flex flex-col gap-14">
							<div className="flex flex-col gap-6">
								<h2 className="text-h1">
									Largest selection of high-speed rockets in the galaxy
								</h2>
								<p className="w-[76%] text-body-md text-night-200">
									Find your favorite brand of rocket from your favorite rocket
									host, then pack your bags and book your next intergalactic
									trip today!
								</p>
							</div>
							<div>
								<ButtonLink to="/search" size="md" variant="primary">
									Explore rockets
								</ButtonLink>
							</div>
						</div>
						<div>SPACESHIP IMAGE</div>
					</div>
				</div>
				<BigSpacer />
				<div className="container mx-auto">
					<div className="mx-auto flex max-w-xl flex-col gap-4 text-center">
						<h2 className="text-h1">How it works</h2>
						<p className="text-body-md text-night-200">
							At Rocket Rental, we bring people who have rockets and people who
							need rockets together so anyone can explore the stars.
						</p>
					</div>
				</div>
				<Spacer size="sm" />
				<div className="container mx-auto">
					<div className="grid grid-cols-3 gap-6">
						<div className="flex h-96 flex-col justify-between rounded-3xl bg-night-500 p-10">
							<div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent-purple">
								📡
							</div>
							<div className="flex flex-col gap-7">
								<div className="text-body-md text-night-200">01</div>
								<p className="text-h3 font-semibold">Find your dream rocket</p>
							</div>
						</div>
						<div className="flex h-96 flex-col justify-between rounded-3xl bg-night-500 p-10">
							<div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent-purple">
								🚀
							</div>
							<div className="flex flex-col gap-7">
								<div className="text-body-md text-night-200">02</div>
								<p className="text-h3 font-semibold">
									Rent a rocket in two clicks
								</p>
							</div>
						</div>
						<div className="flex h-96 flex-col justify-between rounded-3xl bg-night-500 p-10">
							<div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent-purple">
								✨
							</div>
							<div className="flex flex-col gap-7">
								<div className="text-body-md text-night-200">03</div>
								<p className="text-h3 font-semibold">
									Choose a destination and go on a journey
								</p>
							</div>
						</div>
					</div>
				</div>
				<BigSpacer />
				<StarportListSection />
				<Spacer size="xl" />
				<div className="overflow-hidden py-20">
					<Marquee />
				</div>
				<Spacer size="4xl" />
				<div className="container mx-auto">
					<div className="grid grid-cols-2 gap-36">
						<div className="grid grid-cols-2 gap-6">
							<div className="flex flex-col gap-6">
								<div className="flex h-[160px] w-[216px] flex-col items-center justify-center gap-1 rounded-3xl bg-night-500">
									<img className="aspect-square w-16" src="" alt="Zheng" />
									<span className="uppercase">Zheng</span>
								</div>
								<div className="flex h-[160px] w-[216px] flex-col items-center justify-center gap-1 rounded-3xl bg-night-500">
									<img className="aspect-square w-16" src="" alt="Oribtalis" />
									<span className="uppercase">Oribtalis</span>
								</div>
								<div className="flex h-[160px] w-[216px] flex-col items-center justify-center gap-1 rounded-3xl bg-night-500">
									<img className="aspect-square w-16" src="" alt="Cosmic" />
									<span className="uppercase">Cosmic</span>
								</div>
							</div>
							<div className="flex flex-col gap-6 pt-16">
								<div className="flex h-64 w-64 flex-col items-center justify-center gap-10 rounded-3xl bg-night-500">
									<img className="aspect-square w-24" src="" alt="Asteroid" />
									<span className="uppercase">Asteroid</span>
								</div>
								<div className="flex h-64 w-64 flex-col items-center justify-center gap-10 rounded-3xl bg-night-500">
									<img className="aspect-square w-24" src="" alt="Spaceship" />
									<span className="uppercase">Spaceship</span>
								</div>
							</div>
						</div>
						<div className="flex flex-col gap-14 pt-32">
							<div className="flex flex-col gap-6">
								<h2 className="text-h1">
									We have only the best rocket brands!
								</h2>
								<p className="w-[76%] text-body-md text-night-200">
									Hosts on our platform can only list reputable brands of
									rockets - so you can be sure that you're getting the best
									rocket for your trip.
								</p>
							</div>
							<div>
								<ButtonLink to="/search" size="md" variant="primary">
									Explore rockets
								</ButtonLink>
							</div>
						</div>
					</div>
				</div>
				<Spacer size="4xl" />
				<RocketModelsSection />
				<Spacer size="xl" />
				<div className="container mx-auto">
					<div className="text-center">
						<p className="text-night-200">Our advantages</p>
						<h2 className="mx-auto mt-4 max-w-4xl text-h1 tracking-wide">
							Nobody's better at rockets than Rocket Rental
						</h2>
					</div>
					<Spacer size="sm" />
					<div className="flex items-center justify-center rounded-3xl bg-night-500 py-16">
						<div className="flex flex-1 flex-col items-center justify-center gap-1">
							<div
								className={clsx(
									'text-mega',
									styles.statsNumber,
									styles.statsDistance,
								)}
							>
								876
							</div>
							<div className="text-center text-night-200">
								light years flown
							</div>
						</div>
						<div className="flex flex-1 flex-col items-center justify-center gap-1 border-l-2 border-l-gray-500">
							<div
								className={clsx(
									'text-mega',
									styles.statsNumber,
									styles.statsHosts,
								)}
							>
								2.5K
							</div>
							<div className="text-center text-night-200">
								hosts on our platform
							</div>
						</div>
						<div className="flex flex-1 flex-col items-center justify-center gap-1 border-l-2 border-l-gray-500">
							<div
								className={clsx(
									'text-mega',
									styles.statsNumber,
									styles.statsRockets,
								)}
							>
								16K
							</div>
							<div className="text-center text-night-200">
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
							<h3 className="text-h2 text-night-500">
								Buy reliable space travel insurance!
							</h3>
							<p className="mt-4 text-body-lg text-night-300">
								Life happens. And sometimes, it can mess up your space travel
								plans. That's why we offer insurance for all or part of your
								trip to give you peace of mind.
							</p>
							<Link
								to="/insurance"
								className="hover:bg-accent-purple-darker mt-14 inline-block rounded-full bg-accent-purple py-5 px-14 text-lg font-bold"
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
						<h2 className="text-h1">
							Travel to any planet in space on your favorite rocket.
						</h2>
						<Spacer size="xs" />
						<div>
							<ButtonLink to="/search" size="md" variant="primary">
								Explore rockets
							</ButtonLink>
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
		<div className="-mx-2 flex rotate-[-4deg] border-t-2 border-b-2 border-t-pink-500 border-b-accent-purple py-2">
			<ul className={ulClassName}>{children}</ul>
			<ul className={ulClassName} aria-hidden={true}>
				{children}
			</ul>
		</div>
	)
}

const STARPORT_CARD_WIDTH = 280
const STARPORT_CARDS_GAP = 24
const STARPORT_CARD_PLUS_GAP = STARPORT_CARD_WIDTH + STARPORT_CARDS_GAP

function getElapsedSincePrevious(scrollLeft: number): number {
	return scrollLeft % STARPORT_CARD_PLUS_GAP === 0
		? STARPORT_CARD_PLUS_GAP
		: scrollLeft % STARPORT_CARD_PLUS_GAP
}

function getRemainingTillNext(scrollLeft: number): number {
	return STARPORT_CARD_PLUS_GAP - (scrollLeft % STARPORT_CARD_PLUS_GAP)
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

	const scrollRef = useRef<HTMLDivElement>(null)
	const scroll = (cb: (scrollLeft: number) => number) => {
		if (!scrollRef.current) return
		scrollRef.current.scroll({
			left: cb(scrollRef.current.scrollLeft),
			behavior: 'smooth',
		})
	}
	const goPrev = () => scroll(left => left - getElapsedSincePrevious(left))
	const goNext = () => scroll(left => left + getRemainingTillNext(left))

	return (
		<div className="container mx-auto">
			<div className="grid grid-cols-3">
				<div className="flex flex-col justify-between gap-14 border-r-2 border-r-gray-600 pr-10">
					<h2 className="text-h1">Many unique starports available</h2>
					<div>
						<button
							className="rounded-full bg-accent-purple p-6 text-h2 font-bold"
							onClick={goPrev}
						>
							👈
						</button>
						<button
							className="rounded-full bg-accent-purple p-6 text-h2 font-bold"
							onClick={goNext}
						>
							👉
						</button>
					</div>
				</div>
				<div
					ref={scrollRef}
					className="hide-scrollbar relative col-span-2 ml-20 flex snap-x overflow-x-scroll scroll-smooth py-7"
					style={{
						gap: STARPORT_CARDS_GAP,
					}}
				>
					{starports.map(s => (
						<div
							key={s.name}
							className="starport-card flex shrink-0 snap-start flex-col rounded-3xl bg-night-500"
							style={{
								width: STARPORT_CARD_WIDTH,
							}}
						>
							<img
								className="aspect-[35/31] rounded-3xl"
								src={s.imageSrc}
								alt={s.name}
							/>
							<div className="h-10" />
							<div className="flex flex-col gap-2 px-6 pb-8">
								<h3 className="text-h5 line-clamp-1">{s.name}</h3>
								<p className="text-night-200 line-clamp-2">{s.description}</p>
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
	const triggerClassName = 'py-3 px-5 text-body-xl'
	const inactiveTriggerClassName = 'text-night-200 hover:text-white'
	const activeTriggerClassName = 'rounded-full bg-accent-purple'
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
			<p className="text-night-200">Best known</p>
			<Spacer size="4xs" />
			<h2 className="max-w-lg text-h1">A wide variety of rocket models</h2>
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
							className="flex max-w-sm flex-col rounded-3xl bg-night-500"
						>
							<img
								className="aspect-[35/31] rounded-3xl"
								src={ship.imageSrc}
								alt={ship.name}
							/>
							<div className="h-10" />
							<div className="flex flex-col gap-2 px-6 pb-8">
								<h3 className="text-h5 line-clamp-1">{ship.name}</h3>
								<p className="text-night-200 line-clamp-2">
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
							className="flex max-w-sm flex-col rounded-3xl bg-night-500"
						>
							<img
								className="aspect-[35/31] rounded-3xl"
								src={ship.imageSrc}
								alt={ship.name}
							/>
							<div className="h-10" />
							<div className="flex flex-col gap-2 px-6 pb-8">
								<h3 className="text-h5 line-clamp-1">{ship.name}</h3>
								<p className="text-night-200 line-clamp-2">
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
							className="flex max-w-sm flex-col rounded-3xl bg-night-500"
						>
							<img
								className="aspect-[35/31] rounded-3xl"
								src={ship.imageSrc}
								alt={ship.name}
							/>
							<div className="h-10" />
							<div className="flex flex-col gap-2 px-6 pb-8">
								<h3 className="text-h5 line-clamp-1">{ship.name}</h3>
								<p className="text-night-200 line-clamp-2">
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
							className="flex max-w-sm flex-col rounded-3xl bg-night-500"
						>
							<img
								className="aspect-[35/31] rounded-3xl"
								src={ship.imageSrc}
								alt={ship.name}
							/>
							<div className="h-10" />
							<div className="flex flex-col gap-2 px-6 pb-8">
								<h3 className="text-h5 line-clamp-1">{ship.name}</h3>
								<p className="text-night-200 line-clamp-2">
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
							className="flex max-w-sm flex-col rounded-3xl bg-night-500"
						>
							<img
								className="aspect-[35/31] rounded-3xl"
								src={ship.imageSrc}
								alt={ship.name}
							/>
							<div className="h-10" />
							<div className="flex flex-col gap-2 px-6 pb-8">
								<h3 className="text-h5 line-clamp-1">{ship.name}</h3>
								<p className="text-night-200 line-clamp-2">
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
					className="rounded-full border-[1.5px] border-gray-700 px-14 py-5"
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
				<h2 className="max-w-sm text-h1">What our top hosts say</h2>
			</div>
			<Spacer size="sm" />
			<div className="hide-scrollbar relative flex snap-x gap-8 overflow-x-scroll">
				{testimonials.map(({ testimonial, host }) => (
					<div
						key={host.name}
						className="flex h-[320px] w-[440px] shrink-0 snap-start flex-col justify-between rounded-3xl border-[1px] border-gray-500 p-10"
					>
						<p className="quote line-clamp-5">{testimonial}</p>
						<div className="flex gap-4">
							<img
								className="h-14 w-14 rounded-full"
								src={host.imageSrc}
								alt={host.name}
							/>
							<div className="flex flex-col gap-1">
								<h3 className="font-bold">{host.name}</h3>
								<p className="text-body-xs text-night-200">{host.subtitle}</p>
							</div>
						</div>
					</div>
				))}
			</div>
		</>
	)
}

export function BigSpacer() {
	return <div className="h-[276px]" />
}

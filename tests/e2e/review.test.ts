import { faker } from '@faker-js/faker'
import { type Locator } from '@playwright/test'
import {
	createBooking,
	createBrand,
	createShip,
	createShipModel,
	createStarport,
	createUser,
	insertImage,
	lockifyFakerImage,
	oneDay,
} from 'prisma/seed-utils'
import invariant from 'tiny-invariant'
import { dataCleanup, expect, loginPage, prisma, test } from '../test-utils'

test('Users can leave reviews and view them when they are all submitted', async ({
	page: renterPage,
	browser,
	baseURL,
}) => {
	const hostPage = await (await browser.newContext()).newPage()

	const renterUser = await prisma.user.create({
		data: {
			...createUser(),
			renter: { create: {} },
		},
	})
	const shipData = createShip()
	const shipModelImageId = await insertImage(
		prisma,
		lockifyFakerImage(faker.image.transport(512, 512, true)),
	)
	const brandImageId = await insertImage(
		prisma,
		lockifyFakerImage(faker.image.nature(512, 512, true)),
	)
	const starportImageId = await insertImage(
		prisma,
		lockifyFakerImage(faker.image.business(512, 512, true)),
	)
	const shipBrand = await prisma.shipBrand.create({
		data: {
			...createBrand(),
			imageId: brandImageId,
		},
	})
	const hostUser = await prisma.user.create({
		data: {
			...createUser(),
			host: {
				create: {
					ships: {
						create: [
							{
								model: {
									create: {
										...createShipModel(),
										imageId: shipModelImageId,
										brandId: shipBrand.id,
									},
								},
								starport: {
									create: { ...createStarport(), imageId: starportImageId },
								},
								...shipData,
								bookings: {
									create: [
										{
											renterId: renterUser.id,
											...createBooking({
												dailyCharge: shipData.dailyCharge,
												start: new Date(Date.now() - oneDay * 13),
												end: new Date(Date.now() - oneDay * 2),
											}),
										},
									],
								},
							},
						],
					},
				},
			},
		},
		select: {
			id: true,
			username: true,
			host: {
				select: {
					ships: {
						select: {
							bookings: {
								select: { id: true },
							},
						},
					},
				},
			},
		},
	})
	dataCleanup.users.add(renterUser.id)
	dataCleanup.users.add(hostUser.id)
	const firstBooking = hostUser.host?.ships[0].bookings[0]
	invariant(firstBooking, 'Booking not created properly')
	const bookingId = firstBooking.id

	await loginPage({ page: renterPage, baseURL, user: renterUser })
	await loginPage({ page: hostPage, baseURL, user: hostUser })

	await renterPage.goto(`/bookings/${bookingId}`)
	await hostPage.goto(`/bookings/${bookingId}`)

	const shipReview = await submitReview(
		renterPage.getByRole('form', { name: /ship review/i }),
	)
	const hostReview = await submitReview(
		renterPage.getByRole('form', { name: /host review/i }),
	)

	const renterReview = await submitReview(
		hostPage.getByRole('form', { name: /renter review/i }),
	)

	await renterPage.reload()
	await hostPage.reload()

	await expect(
		renterPage.getByRole('region', { name: /ship review/i }),
	).toBeVisible()

	await expectReview(
		renterPage.getByRole('region', { name: /ship review/i }),
		shipReview,
	)
	await expectReview(
		renterPage.getByRole('region', { name: /host review/i }),
		hostReview,
	)
	await expectReview(
		renterPage.getByRole('region', { name: /renter review/i }),
		renterReview,
	)

	await expectReview(
		hostPage.getByRole('region', { name: /ship review/i }),
		shipReview,
	)
	await expectReview(
		hostPage.getByRole('region', { name: /host review/i }),
		hostReview,
	)
	await expectReview(
		hostPage.getByRole('region', { name: /renter review/i }),
		renterReview,
	)
})

async function submitReview(formLocator: Locator) {
	const rating = faker.helpers.arrayElement([1, 2, 3, 4, 5])
	await formLocator
		.getByRole('radiogroup', { name: /rating/i })
		.getByRole('radio', { name: new RegExp(rating.toString()) })
		.click()
	const description = faker.lorem.sentence()
	await formLocator.getByRole('textbox').fill(description)
	await formLocator.getByRole('button', { name: /create/i }).click()
	const loadingIndicator = formLocator.getByText('...')
	await expect(loadingIndicator).toBeVisible()
	await expect(loadingIndicator).not.toBeVisible()
	return { rating, description }
}

async function expectReview(
	sectionLocator: Locator,
	{ rating, description }: { rating: number; description: string },
) {
	await expect(sectionLocator.getByText(description)).toBeVisible()
	// TODO: fix this assertion
	// await expect(sectionLocator.getByLabel(`${rating} star review`)).toBeVisible()
}

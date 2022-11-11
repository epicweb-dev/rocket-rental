import './init-env-vars'
import { installGlobals } from '@remix-run/node'
import '@testing-library/jest-dom/extend-expect'
import 'dotenv/config'
import { prisma } from '~/db.server'

installGlobals()

afterEach(async () => {
	await prisma.user.deleteMany({ where: {} })
	await prisma.ship.deleteMany({ where: {} })
	await prisma.shipBrand.deleteMany({ where: {} })
	await prisma.starport.deleteMany({ where: {} })
	await prisma.booking.deleteMany({ where: {} })
	await prisma.chat.deleteMany({ where: {} })
})

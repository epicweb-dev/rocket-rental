import fs from 'fs'
import { installGlobals } from '@remix-run/node'
import '@testing-library/jest-dom/extend-expect'
import 'dotenv/config'
import { db } from '~/utils/db.server'

installGlobals()

const filename = `data.${process.env.VITEST_POOL_ID || 0}.db`
process.env.DATABASE_PATH = `./prisma/test/${filename}`
process.env.DATABASE_URL = `file:./test/${filename}?connection_limit=1`
fs.copyFileSync('prisma/test/base.db', process.env.DATABASE_PATH)

afterEach(async () => {
	db.transaction(() => {
		db.exec(`
			DELETE FROM user;
			DELETE FROM ship;
			DELETE FROM shipBrand;
			DELETE FROM starport;
			DELETE FROM booking;
			DELETE FROM chat;
		`)
	})
})

afterAll(async () => {
	await fs.promises.rm(process.env.DATABASE_PATH)
})

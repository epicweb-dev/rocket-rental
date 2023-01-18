import './setup-env-vars'
import { installGlobals } from '@remix-run/node'
import matchers, {
	type TestingLibraryMatchers,
} from '@testing-library/jest-dom/matchers'
import 'dotenv/config'
import fs from 'fs'
import { db } from '~/utils/db.server'

declare global {
	namespace Vi {
		interface JestAssertion<T = any>
			extends jest.Matchers<void, T>,
				TestingLibraryMatchers<T, void> {}
	}
}

expect.extend(matchers)

installGlobals()
fs.copyFileSync('prisma/test/base.db', process.env.DATABASE_PATH)

afterEach(() => {
	db.exec(`
		DELETE FROM user;
		DELETE FROM ship;
		DELETE FROM shipBrand;
		DELETE FROM starport;
		DELETE FROM booking;
		DELETE FROM chat;
	`)
})

afterAll(async () => {
	await fs.promises.rm(process.env.DATABASE_PATH)
})

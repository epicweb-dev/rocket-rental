import './setup-env-vars.ts'
import { installGlobals } from '@remix-run/node'
import { matchers, type TestingLibraryMatchers } from './matchers.cjs'
import 'dotenv/config'
import fs from 'fs'
import { db } from '~/utils/db.server.ts'
import { BASE_DATABASE_PATH, DATABASE_PATH } from './paths.ts'
import { deleteAllData } from './utils.ts'
import '../../mocks/index.ts'

declare global {
	namespace Vi {
		interface JestAssertion<T = any>
			extends jest.Matchers<void, T>,
				TestingLibraryMatchers<T, void> {}
	}
}

expect.extend(matchers)

installGlobals()
fs.copyFileSync(BASE_DATABASE_PATH, DATABASE_PATH)

afterEach(() => {
	deleteAllData(db)
})

afterAll(async () => {
	await fs.promises.rm(DATABASE_PATH)
})

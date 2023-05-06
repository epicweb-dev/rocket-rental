import './setup-env-vars'
import { installGlobals } from '@remix-run/node'
import matchers, {
	type TestingLibraryMatchers,
} from '@testing-library/jest-dom/matchers'
import 'dotenv/config'
import fs from 'fs'
import { db } from '~/utils/db.server'
import { BASE_DATABASE_PATH, DATABASE_PATH } from './paths'
import { deleteAllData } from './utils'
import '../../mocks'

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

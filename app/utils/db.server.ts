import { PrismaClient } from '@prisma/client'
import type BetterSqlite3 from 'better-sqlite3'
import Database from 'better-sqlite3'

let prisma: PrismaClient
let db: BetterSqlite3.Database

declare global {
	var __prisma__: PrismaClient
	var __db__: BetterSqlite3.Database
}

// this is needed because in development we don't want to restart
// the server with every change, but we want to make sure we don't
// create a new connection to the DB with every change either.
// in production we'll have a single connection to the DB.
if (process.env.NODE_ENV === 'production') {
	prisma = new PrismaClient()
	db = new Database(process.env.DATABASE_PATH)
} else {
	if (!global.__prisma__) {
		global.__prisma__ = new PrismaClient()
	}
	if (!global.__db__) {
		global.__db__ = new Database(process.env.DATABASE_PATH, {
			// Turn this on for help with db queries:
			// verbose: console.log,
		})
	}
	prisma = global.__prisma__
	db = global.__db__
	prisma.$connect()
}

export function interpolateArray(array: Array<string>, key: string) {
	const query = array.map((e, i) => `@${key}${i}`).join(',')
	const interpolations: Record<string, string> = {}
	for (let index = 0; index < array.length; index++) {
		interpolations[`${key}${index}`] = array[index]
	}
	return { query, interpolations }
}

export { prisma, db }

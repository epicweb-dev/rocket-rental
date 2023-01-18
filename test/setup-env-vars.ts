const filename = `data.${process.env.VITEST_POOL_ID || 0}.db`
process.env.DATABASE_PATH = `./prisma/test/${filename}`
process.env.DATABASE_URL = `file:./test/${filename}?connection_limit=1`

export {}

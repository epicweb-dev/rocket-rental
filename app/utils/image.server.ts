import Database from 'better-sqlite3'
import invariant from 'tiny-invariant'

declare global {
	// This preserves the database connection during development
	// eslint-disable-next-line
	var __imageDb: ReturnType<typeof Database> | undefined
}

export const imageDb = (global.__imageDb = global.__imageDb
	? global.__imageDb
	: createDatabase())

function createDatabase() {
	invariant(process.env.IMAGE_DATABASE_PATH, 'IMAGE_DATABASE_PATH is not set')
	const db = new Database(process.env.IMAGE_DATABASE_PATH)
	db.exec(/* sql */ `
		CREATE TABLE IF NOT EXISTS "Image" (
			"id" TEXT PRIMARY KEY DEFAULT (
				-- UUID (thanks ChatGPT 😂)
				lower(hex(randomblob(4))) || '-' ||
				lower(hex(randomblob(2))) || '-4' ||
				substr(lower(hex(randomblob(2))), 2) || '-a' ||
				substr(lower(hex(randomblob(2))), 2) || '-' ||
				lower(hex(randomblob(6)))
			),
			"createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			"updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			"blob" BLOB NOT NULL,
			"contentType" TEXT NOT NULL,
			"altText" TEXT
		);

		CREATE UNIQUE INDEX IF NOT EXISTS "Image_id_key" ON "Image"("id");

		DROP TRIGGER IF EXISTS update_updated_at;
		CREATE TRIGGER update_updated_at
			AFTER UPDATE ON Image
			BEGIN
				UPDATE Image SET updatedAt = datetime('now') WHERE id = NEW.id;
			END;
	`)
	return db
}

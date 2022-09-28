-- AlterTable
ALTER TABLE "Admin" ADD COLUMN "createdAt" DATETIME;
ALTER TABLE "Admin" ADD COLUMN "updatedAt" DATETIME;

-- AlterTable
ALTER TABLE "Host" ADD COLUMN "createdAt" DATETIME;
ALTER TABLE "Host" ADD COLUMN "updatedAt" DATETIME;

-- AlterTable
ALTER TABLE "Renter" ADD COLUMN "createdAt" DATETIME;
ALTER TABLE "Renter" ADD COLUMN "updatedAt" DATETIME;

/*
Start hand-written SQL. I hope this works 🤞
*/

-- Update Admin
UPDATE "Admin" SET "createdAt" = "User"."createdAt" FROM "User" WHERE "Admin"."userId" = "User"."id";
UPDATE "Admin" SET "updatedAt" = "User"."updatedAt" FROM "User" WHERE "Admin"."userId" = "User"."id";

-- Update Host
UPDATE "Host" SET "createdAt" = "User"."createdAt" FROM "User" WHERE "Host"."userId" = "User"."id";
UPDATE "Host" SET "updatedAt" = "User"."updatedAt" FROM "User" WHERE "Host"."userId" = "User"."id";

-- Update Renter
UPDATE "Renter" SET "createdAt" = "User"."createdAt" FROM "User" WHERE "Renter"."userId" = "User"."id";
UPDATE "Renter" SET "updatedAt" = "User"."updatedAt" FROM "User" WHERE "Renter"."userId" = "User"."id";

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Admin" (
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Admin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Admin" ("createdAt", "updatedAt", "userId") SELECT coalesce("createdAt", CURRENT_TIMESTAMP) AS "createdAt", "updatedAt", "userId" FROM "Admin";
DROP TABLE "Admin";
ALTER TABLE "new_Admin" RENAME TO "Admin";
CREATE UNIQUE INDEX "Admin_userId_key" ON "Admin"("userId");
CREATE TABLE "new_Host" (
    "userId" TEXT NOT NULL,
    "bio" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Host_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Host" ("bio", "createdAt", "updatedAt", "userId") SELECT "bio", coalesce("createdAt", CURRENT_TIMESTAMP) AS "createdAt", "updatedAt", "userId" FROM "Host";
DROP TABLE "Host";
ALTER TABLE "new_Host" RENAME TO "Host";
CREATE UNIQUE INDEX "Host_userId_key" ON "Host"("userId");
CREATE TABLE "new_Renter" (
    "userId" TEXT NOT NULL,
    "bio" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Renter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Renter" ("bio", "createdAt", "updatedAt", "userId") SELECT "bio", coalesce("createdAt", CURRENT_TIMESTAMP) AS "createdAt", "updatedAt", "userId" FROM "Renter";
DROP TABLE "Renter";
ALTER TABLE "new_Renter" RENAME TO "Renter";
CREATE UNIQUE INDEX "Renter_userId_key" ON "Renter"("userId");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

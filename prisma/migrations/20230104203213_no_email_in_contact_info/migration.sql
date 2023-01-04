/*
  Warnings:

  - You are about to drop the column `email` on the `ContactInfo` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ContactInfo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "country" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "ContactInfo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ContactInfo" ("address", "city", "country", "createdAt", "id", "phone", "state", "updatedAt", "userId", "zip") SELECT "address", "city", "country", "createdAt", "id", "phone", "state", "updatedAt", "userId", "zip" FROM "ContactInfo";
DROP TABLE "ContactInfo";
ALTER TABLE "new_ContactInfo" RENAME TO "ContactInfo";
CREATE UNIQUE INDEX "ContactInfo_id_key" ON "ContactInfo"("id");
CREATE UNIQUE INDEX "ContactInfo_userId_key" ON "ContactInfo"("userId");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

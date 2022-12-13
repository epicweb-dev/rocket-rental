/*
  Warnings:

  - You are about to drop the column `brandId` on the `Ship` table. All the data in the column will be lost.
  - Added the required column `modelId` to the `Ship` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "ShipModel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    CONSTRAINT "ShipModel_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "ShipBrand" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Ship" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "dailyCharge" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "modelId" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "starportId" TEXT NOT NULL,
    CONSTRAINT "Ship_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "ShipModel" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Ship_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "Host" ("userId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Ship_starportId_fkey" FOREIGN KEY ("starportId") REFERENCES "Starport" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Ship" ("capacity", "createdAt", "dailyCharge", "description", "hostId", "id", "imageUrl", "name", "starportId", "updatedAt") SELECT "capacity", "createdAt", "dailyCharge", "description", "hostId", "id", "imageUrl", "name", "starportId", "updatedAt" FROM "Ship";
DROP TABLE "Ship";
ALTER TABLE "new_Ship" RENAME TO "Ship";
CREATE UNIQUE INDEX "Ship_id_key" ON "Ship"("id");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

-- CreateIndex
CREATE UNIQUE INDEX "ShipModel_id_key" ON "ShipModel"("id");

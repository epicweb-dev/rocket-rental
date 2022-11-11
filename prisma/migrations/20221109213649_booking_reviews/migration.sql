/*
  Warnings:

  - Added the required column `bookingId` to the `RenterReview` table without a default value. This is not possible if the table is not empty.
  - Added the required column `bookingId` to the `HostReview` table without a default value. This is not possible if the table is not empty.
  - Added the required column `bookingId` to the `ShipReview` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_RenterReview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rating" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "renterId" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    CONSTRAINT "RenterReview_renterId_fkey" FOREIGN KEY ("renterId") REFERENCES "Renter" ("userId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RenterReview_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "Host" ("userId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RenterReview_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_RenterReview" ("createdAt", "description", "hostId", "id", "rating", "renterId", "updatedAt") SELECT "createdAt", "description", "hostId", "id", "rating", "renterId", "updatedAt" FROM "RenterReview";
DROP TABLE "RenterReview";
ALTER TABLE "new_RenterReview" RENAME TO "RenterReview";
CREATE UNIQUE INDEX "RenterReview_id_key" ON "RenterReview"("id");
CREATE UNIQUE INDEX "RenterReview_bookingId_key" ON "RenterReview"("bookingId");
CREATE TABLE "new_HostReview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rating" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "renterId" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    CONSTRAINT "HostReview_renterId_fkey" FOREIGN KEY ("renterId") REFERENCES "Renter" ("userId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "HostReview_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "Host" ("userId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "HostReview_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_HostReview" ("createdAt", "description", "hostId", "id", "rating", "renterId", "updatedAt") SELECT "createdAt", "description", "hostId", "id", "rating", "renterId", "updatedAt" FROM "HostReview";
DROP TABLE "HostReview";
ALTER TABLE "new_HostReview" RENAME TO "HostReview";
CREATE UNIQUE INDEX "HostReview_id_key" ON "HostReview"("id");
CREATE UNIQUE INDEX "HostReview_bookingId_key" ON "HostReview"("bookingId");
CREATE TABLE "new_ShipReview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rating" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "renterId" TEXT NOT NULL,
    "shipId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    CONSTRAINT "ShipReview_renterId_fkey" FOREIGN KEY ("renterId") REFERENCES "Renter" ("userId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ShipReview_shipId_fkey" FOREIGN KEY ("shipId") REFERENCES "Ship" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ShipReview_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ShipReview" ("createdAt", "description", "id", "rating", "renterId", "shipId", "updatedAt") SELECT "createdAt", "description", "id", "rating", "renterId", "shipId", "updatedAt" FROM "ShipReview";
DROP TABLE "ShipReview";
ALTER TABLE "new_ShipReview" RENAME TO "ShipReview";
CREATE UNIQUE INDEX "ShipReview_id_key" ON "ShipReview"("id");
CREATE UNIQUE INDEX "ShipReview_bookingId_key" ON "ShipReview"("bookingId");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_RenterReview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rating" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "subjectId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    CONSTRAINT "RenterReview_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Renter" ("userId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RenterReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "Host" ("userId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RenterReview_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_RenterReview" ("bookingId", "content", "createdAt", "id", "rating", "reviewerId", "subjectId", "updatedAt") SELECT "bookingId", "content", "createdAt", "id", "rating", "reviewerId", "subjectId", "updatedAt" FROM "RenterReview";
DROP TABLE "RenterReview";
ALTER TABLE "new_RenterReview" RENAME TO "RenterReview";
CREATE UNIQUE INDEX "RenterReview_id_key" ON "RenterReview"("id");
CREATE UNIQUE INDEX "RenterReview_bookingId_key" ON "RenterReview"("bookingId");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

-- Manually written migration:
-- Rename the column `description` on the `HostReview` table to `content`
-- Rename the column `hostId` on the `HostReview` table to `subjectId`
-- Rename the column `renterId` on the `HostReview` table to `reviewerId`
-- Rename the column `description` on the `ShipReview` table to `content`
-- Rename the column `renterId` on the `ShipReview` table to `reviewerId`
-- Rename the column `shipId` on the `ShipReview` table to `subjectId`
-- Rename the column `description` on the `RenterReview` table to `content`
-- Rename the column `hostId` on the `RenterReview` table to `subjectId`
-- Rename the column `renterId` on the `RenterReview` table to `reviewerId`
ALTER TABLE
	"HostReview"
RENAME COLUMN
	"description" TO "content";

ALTER TABLE
	"HostReview"
RENAME COLUMN
	"hostId" TO "subjectId";

ALTER TABLE
	"HostReview"
RENAME COLUMN
	"renterId" TO "reviewerId";

ALTER TABLE
	"ShipReview"
RENAME COLUMN
	"description" TO "content";

ALTER TABLE
	"ShipReview"
RENAME COLUMN
	"renterId" TO "reviewerId";

ALTER TABLE
	"ShipReview"
RENAME COLUMN
	"shipId" TO "subjectId";

ALTER TABLE
	"RenterReview"
RENAME COLUMN
	"description" TO "content";

ALTER TABLE
	"RenterReview"
RENAME COLUMN
	"hostId" TO "subjectId";

ALTER TABLE
	"RenterReview"
RENAME COLUMN
	"renterId" TO "reviewerId";

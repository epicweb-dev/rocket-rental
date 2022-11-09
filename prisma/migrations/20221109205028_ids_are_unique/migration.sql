/*
  Warnings:

  - A unique constraint covering the columns `[id]` on the table `Booking` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id]` on the table `Chat` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id]` on the table `ContactInfo` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id]` on the table `HostReview` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id]` on the table `Message` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id]` on the table `RenterReview` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id]` on the table `Ship` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id]` on the table `ShipBrand` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id]` on the table `ShipReview` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id]` on the table `Starport` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Booking_id_key" ON "Booking"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Chat_id_key" ON "Chat"("id");

-- CreateIndex
CREATE UNIQUE INDEX "ContactInfo_id_key" ON "ContactInfo"("id");

-- CreateIndex
CREATE UNIQUE INDEX "HostReview_id_key" ON "HostReview"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Message_id_key" ON "Message"("id");

-- CreateIndex
CREATE UNIQUE INDEX "RenterReview_id_key" ON "RenterReview"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Ship_id_key" ON "Ship"("id");

-- CreateIndex
CREATE UNIQUE INDEX "ShipBrand_id_key" ON "ShipBrand"("id");

-- CreateIndex
CREATE UNIQUE INDEX "ShipReview_id_key" ON "ShipReview"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Starport_id_key" ON "Starport"("id");

-- AlterTable
ALTER TABLE "_BookingFlights" ADD CONSTRAINT "_BookingFlights_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_BookingFlights_AB_unique";

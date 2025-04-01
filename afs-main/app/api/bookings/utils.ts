import { Booking, Flight } from "../../../utils/types";

interface PrismaBooking {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  passportNumber: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "UNKNOWN";
  agencyId: string;
  createdAt: Date;
}

export const transformBooking = (
  booking: PrismaBooking & { flights: Flight[] },
): Booking => {
  const id = booking.id;

  // Create a shallow copy of the booking object without the id property
  const { id: _, ...rest } = booking;

  return {
    bookingReference: id.slice(0, 6).toUpperCase(), // First 6 characters of the id
    ticketNumber: id.slice(26), // Next 4 characters of the id
    ...rest,
  };
};
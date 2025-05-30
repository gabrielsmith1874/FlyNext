import { prisma } from "../../../utils/db";
import { AsyncApiResponse, Booking, RestfulNextRequest } from "../../../utils/types";
import { transformBooking } from "./utils";
import { flightSelectFields } from "../flights/utils";
import { withAuth } from "../../../middlewares/auth";
import { NextResponse } from "next/server";
import { restful } from "../../../middlewares/restful";
import { validateStringFields } from "../../../utils/query";

interface BookingRequest {
  firstName: string;
  lastName: string;
  email: string;
  passportNumber: string;
  flightIds: string[];
}

enum FlightStatus {
  SCHEDULED = "SCHEDULED",
  CANCELLED = "CANCELLED",
  DELAYED = "DELAYED",
  DEPARTED = "DEPARTED",
  LANDED = "LANDED"
}

enum BookingStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  CANCELLED = "CANCELLED",
  UNKNOWN = "UNKNOWN"
}

interface Agency {
  id: string;
  name: string;
  apiKey: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

async function post(
  request: RestfulNextRequest & { agency: Agency },
): Promise<NextResponse<Booking | { error: string }>> {
  validateStringFields(request, [
    "firstName",
    "lastName",
    "email",
    "passportNumber",
  ]);
  const { flightIds, firstName, lastName, email, passportNumber } =
    request.data as BookingRequest;

  if (passportNumber.length < 9) {
    return NextResponse.json(
      { error: "Passport number must be 9 digits long" },
      { status: 400 },
    );
  }

  if (
    !Array.isArray(flightIds) ||
    !flightIds.length ||
    flightIds.findIndex((id) => typeof id !== "string" || !id.length) !== -1
  ) {
    return NextResponse.json(
      {
        error: "Missing or invalid flight IDs",
      },
      { status: 400 },
    );
  }

  try {
    // Fetch flight details for all legs
    const flights = await prisma.flight.findMany({
      where: { id: { in: flightIds } },
      orderBy: { departureTime: "asc" }, // Ensure flights are in order by departure time
    });

    if (flights.length !== flightIds.length) {
      return NextResponse.json(
        {
          error: "One or more flights not found",
        },
        { status: 404 },
      );
    }

    // Check seat availability for each leg and verify they are in sequence
    for (let i = 0; i < flights.length; i++) {
      const flight = flights[i];

      // Check if the flight has available seats (only 1 seat is required)
      if (
        flight.status !== FlightStatus.SCHEDULED ||
        flight.availableSeats < 1
      ) {
        return NextResponse.json(
          {
            error: `No available seats on flight ${flight.id}`,
          },
          { status: 400 },
        );
      }

      // Ensure flights are consecutive in sequence (if more than one leg)
      if (i > 0 && flights[i - 1].arrivalTime >= flight.departureTime) {
        return NextResponse.json(
          {
            error: "Flights are not consecutive in sequence",
          },
          { status: 400 },
        );
      }
    }

    // Create the booking with passenger information and link flights
    const booking = await prisma.booking.create({
      data: {
        firstName,
        lastName,
        email,
        passportNumber,
        flights: {
          connect: flightIds.map((flightId) => ({ id: flightId })),
        },
        status: BookingStatus.CONFIRMED,
        agencyId: request.agency.id,
      },
      include: {
        flights: {
          select: flightSelectFields,
        },
      },
    });

    // Update available seats on each flight
    for (const flight of flights) {
      await prisma.flight.update({
        where: { id: flight.id },
        data: { availableSeats: { decrement: 1 } },
      });
    }

    return NextResponse.json(transformBooking(booking));
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error: "An error occurred while processing your booking",
      },
      { status: 500 },
    );
  }
}

async function postWithCors(req: any) {
  const response = await post(req);
  response.headers.set('Access-Control-Allow-Origin', '*'); // Allow all origins or replace with 'http://localhost:3000'
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');
  return response;
}

export const POST = withAuth(restful(postWithCors));

// Handle preflight requests
export const OPTIONS = async () => {
  const response = new NextResponse(null, { status: 204 });
  response.headers.set('Access-Control-Allow-Origin', '*'); // Allow all origins or replace with 'http://localhost:3000'
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');
  return response;
};

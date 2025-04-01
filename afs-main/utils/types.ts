import { NextRequest, NextResponse } from "next/server";

export type ApiHandler<T = NextRequest> = (
  req: T,
  args: { params: Promise<any> },
) => Promise<NextResponse> | NextResponse;

// Request object with parsed JSON body and agency
export type RestfulNextRequest = NextRequest & {
  data: any;
  agency: Agency;
};

export interface Agency {
  id: string;
  name: string;
  apiKey: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
// Response object with a posible error message
export type AsyncApiResponse = Promise<NextResponse>;

export interface Airport {
  id: string;
  code: string;
  name: string;
  city: string;
  country: string;
}

export interface City {
  name: string;
  country: string;
}

export interface Airline {
  name: string;
  code: string;
  base: {
    city: string;
    country: string;
  };
}

export interface Flight {
  id: string;
  flightNumber: string;
  departureTime: string;
  arrivalTime: string;
  price: number;
  currency: number;
  originId: string;
  destinationId: string;
  airline: {
    name: string;
    code: string;
  };
  origin: {
    name: string;
    code: string;
    city: string;
    country: string;
  };
  destination: {
    name: string;
    code: string;
    city: string;
    country: string;
  };
}

export interface Booking {
  firstName: string;
  lastName: string;
  email: string;
  passportNumber: string;
  bookingReference: string;
  ticketNumber: string;
  agencyId: string;
  flights: Flight[];
}

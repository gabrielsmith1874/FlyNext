import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { bookFlights } from '@/lib/afs-api';
import { generateBookingReference, calculateTotalPrice } from '@/lib/utils';
import { verifyToken } from '@/lib/auth';

export async function POST(request) {
  try {
    // Get and verify token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const user = await verifyToken(token);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { firstName, lastName, email, passportNumber, flightIds } = body;

    // Use user's stored passport ID if available, otherwise use provided passportNumber
    const finalPassportNumber = user.passportId || passportNumber;
    
    // Validate passport number length
    if (!finalPassportNumber || finalPassportNumber.length !== 9) {
      return NextResponse.json(
        { error: 'Passport number must be exactly 9 characters' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!firstName || !lastName || !email || !flightIds || !flightIds.length) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Book flights with AFS
    const afsBooking = await bookFlights({
      firstName,
      lastName,
      email,
      passportNumber,
      flightIds
    });
    
    // Calculate total price
    const totalPrice = calculateTotalPrice(afsBooking.flights);
    
    // Create booking in database
    const booking = await prisma.booking.create({
      data: {
        userId: user.id,
        bookingReference: afsBooking.bookingReference,
        ticketNumber: afsBooking.ticketNumber,
        status: 'CONFIRMED',
        totalPrice,
        currency: afsBooking.flights[0].currency,
        flights: {
          create: afsBooking.flights.map(flight => ({
            flightId: flight.id,
            flightNumber: flight.flightNumber,
            airline: flight.airline.name,
            origin: flight.origin.code,
            destination: flight.destination.code,
            departureTime: new Date(flight.departureTime),
            arrivalTime: new Date(flight.arrivalTime),
            price: flight.price,
            currency: flight.currency,
            status: flight.status
          }))
        }
      },
      include: {
        flights: true
      }
    });
    
    // Create notification
    await prisma.notification.create({
      data: {
        userId: user.id,
        message: `Your flight booking (${booking.bookingReference}) has been confirmed.`,
        type: 'BOOKING_CONFIRMATION'
      }
    });
    
    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    console.error('Booking error:', error);
    return NextResponse.json(
      { error: 'Booking failed' },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    // Get and verify token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const user = await verifyToken(token);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }
    
    // Get bookings for user
    const bookings = await prisma.booking.findMany({
      where: { userId: user.id },
      include: {
        flights: true,
        hotelBookings: {
          include: {
            hotel: true,
            room: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return NextResponse.json(bookings);
  } catch (error) {
    console.error('Get bookings error:', error);
    return NextResponse.json(
      { error: 'Failed to get bookings' },
      { status: 500 }
    );
  }
}
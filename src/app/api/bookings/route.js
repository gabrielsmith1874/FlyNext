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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const token = authHeader.split(' ')[1];
    console.log("Token received:", token.substring(0, 15) + "...");
    
    const decodedToken = await verifyToken(token);
    if (!decodedToken) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    console.log("Decoded token user ID:", decodedToken.id);
    
    // Verify that the user exists in the database
    let user;
    try {
      user = await prisma.user.findUnique({
        where: { id: decodedToken.id }
      });
      
      if (!user && decodedToken.email) {
        // Try to find user by email if ID lookup fails
        user = await prisma.user.findUnique({
          where: { email: decodedToken.email }
        });
        console.log("User found by email instead of ID");
      }
    } catch (dbError) {
      console.error("Database error when finding user:", dbError);
      return NextResponse.json({ 
        error: 'Database error', 
        details: dbError.message 
      }, { status: 500 });
    }
    
    if (!user) {
      console.log("User not found for ID:", decodedToken.id);
      console.log("Token payload:", JSON.stringify(decodedToken));
      return NextResponse.json({ 
        error: 'User not found',
        userId: decodedToken.id
      }, { status: 404 });
    }
    
    const body = await request.json();
    // Log the incoming payload to help debug
    console.log("Booking payload:", body);
    const { firstName, lastName, email, passportNumber, flightIds } = body;
    
    // Validate required fields
    if (!firstName || !lastName || !email || !flightIds || !flightIds.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Use user's stored passport ID if available, otherwise use provided passportNumber
    const finalPassportNumber = user.passportId || passportNumber;
    // Validate passport number length (exactly 9 characters)
    if (!finalPassportNumber || finalPassportNumber.length !== 9) {
      return NextResponse.json({ error: 'Passport number must be exactly 9 characters' }, { status: 400 });
    }

    // Book flights with AFS
    const afsBooking = await bookFlights({
      firstName,
      lastName,
      email,
      passportNumber: finalPassportNumber,
      flightIds
    });
    
    // Calculate total price from the flight bookings
    const totalPrice = calculateTotalPrice(afsBooking.flights);
    
    // Check if a pending booking already exists for this user
    const existingBooking = await prisma.booking.findFirst({
      where: { userId: user.id, status: 'PENDING' },
      include: { flights: true, hotelBookings: true }
    });
    
    let booking;
    if (existingBooking) {
      // Append new flight bookings and update total price
      booking = await prisma.booking.update({
        where: { id: existingBooking.id },
        data: {
          totalPrice: existingBooking.totalPrice + totalPrice,
          flights: {
            create: afsBooking.flights.map(flight => ({
              flightId: flight.id,
              flightNumber: flight.flightNumber,
              airline: typeof flight.airline === 'object' ? flight.airline.name : flight.airline,
              origin: typeof flight.origin === 'object' ? flight.origin.code : flight.origin,
              destination: typeof flight.destination === 'object' ? flight.destination.code : flight.destination,
              departureTime: new Date(flight.departureTime),
              arrivalTime: new Date(flight.arrivalTime),
              price: flight.price,
              currency: flight.currency,
              status: flight.status,
              isConnectingLeg: flight.isConnectingLeg || false,
              connectionGroupId: flight.connectionGroupId || null
            }))
          }
        },
        include: { flights: true, hotelBookings: true }
      });
    } else {
      // Create new booking
      booking = await prisma.booking.create({
        data: {
          userId: user.id,
          bookingReference: afsBooking.bookingReference || generateBookingReference(),
          status: 'PENDING',
          totalPrice,
          flights: {
            create: afsBooking.flights.map(flight => ({
              flightId: flight.id,
              flightNumber: flight.flightNumber,
              airline: typeof flight.airline === 'object' ? flight.airline.name : flight.airline,
              origin: typeof flight.origin === 'object' ? flight.origin.code : flight.origin,
              destination: typeof flight.destination === 'object' ? flight.destination.code : flight.destination,
              departureTime: new Date(flight.departureTime),
              arrivalTime: new Date(flight.arrivalTime),
              price: flight.price,
              currency: flight.currency,
              status: flight.status,
              isConnectingLeg: flight.isConnectingLeg || false,
              connectionGroupId: flight.connectionGroupId || null
            }))
          }
        },
        include: { flights: true }
      });
    }
    
    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    console.error('Booking error:', error);
    return NextResponse.json(
      { error: 'Booking failed', details: error.message },
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
    console.log("GET Token received:", token.substring(0, 15) + "...");
    
    const decodedToken = await verifyToken(token);
    if (!decodedToken) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }
    
    console.log("GET Decoded token user ID:", decodedToken.id);
    
    // Verify that the user exists in the database
    let user;
    try {
      user = await prisma.user.findUnique({
        where: { id: decodedToken.id }
      });
      
      if (!user && decodedToken.email) {
        // Try to find user by email if ID lookup fails
        user = await prisma.user.findUnique({
          where: { email: decodedToken.email }
        });
        console.log("User found by email instead of ID");
      }
    } catch (dbError) {
      console.error("Database error when finding user:", dbError);
      return NextResponse.json({ 
        error: 'Database error', 
        details: dbError.message 
      }, { status: 500 });
    }
    
    if (!user) {
      console.log("User not found for ID:", decodedToken.id);
      console.log("Token payload:", JSON.stringify(decodedToken));
      return NextResponse.json({ 
        error: 'User not found',
        userId: decodedToken.id
      }, { status: 404 });
    }
    
    // Get bookings for user
    const bookings = await prisma.booking.findMany({
      where: { userId: user.id },
      include: {
        flights: {
          select: {
            flightId: true,
            flightNumber: true,
            airline: true,
            origin: true,
            destination: true,
            departureTime: true,
            arrivalTime: true,
            price: true,
            currency: true,
            status: true,
            isConnectingLeg: true,
            connectionGroupId: true
          }
        },
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
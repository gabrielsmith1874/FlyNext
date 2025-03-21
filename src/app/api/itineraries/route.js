import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { generateBookingReference } from '@/lib/utils';
import { bookFlights } from '@/lib/afs-api';

// Create a new itinerary (combination of flights and hotel)
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
    const { 
      flights, // Flight booking information if any
      hotel,   // Hotel booking information if any
      saveItinerary // Whether to save as draft or proceed to checkout
    } = body;

    // Validate that at least one of flights or hotel is provided
    if (!flights && !hotel) {
      return NextResponse.json(
        { error: 'At least one of flights or hotel must be provided' },
        { status: 400 }
      );
    }

    // Create a booking reference
    const bookingReference = generateBookingReference();
    
    // Calculate total price
    let totalPrice = 0;
    let currency = 'USD';

    // Flight booking handling
    let flightBookingData = [];
    if (flights && flights.flightIds && flights.flightIds.length > 0) {
      // Book flights with AFS
      const afsBooking = await bookFlights({
        firstName: flights.firstName || user.firstName,
        lastName: flights.lastName || user.lastName,
        email: flights.email || user.email,
        passportNumber: user.passportId || flights.passportNumber,
        flightIds: flights.flightIds
      });
      
      // Add to total price
      totalPrice += afsBooking.flights.reduce((sum, flight) => sum + flight.price, 0);
      currency = afsBooking.flights[0].currency;
      
      // Map flight data
      flightBookingData = afsBooking.flights.map(flight => ({
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
      }));
    }

    // Hotel booking handling
    let hotelBookingData = null;
    if (hotel) {
      const { hotelId, roomId, checkInDate, checkOutDate, guestCount } = hotel;
      
      // Validate hotel booking data
      if (!hotelId || !roomId || !checkInDate || !checkOutDate || !guestCount) {
        return NextResponse.json(
          { error: 'Missing required fields for hotel booking' },
          { status: 400 }
        );
      }
      
      // Get room details
      const room = await prisma.room.findUnique({
        where: { id: roomId },
        include: { hotel: true }
      });
      
      if (!room) {
        return NextResponse.json(
          { error: 'Room not found' },
          { status: 404 }
        );
      }
      
      // Check availability and calculate price
      const checkIn = new Date(checkInDate);
      const checkOut = new Date(checkOutDate);
      const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
      
      // Create an array of all dates in the booking range
      const dateRange = getDatesInRange(checkIn, checkOut);
      
      // Check availability for each date in the range
      const availability = await Promise.all(
        dateRange.map(async (date) => {
          // Calculate bookings for this date
          const bookingsOnDate = await prisma.hotelBooking.count({
            where: {
              roomId,
              status: 'CONFIRMED',
              booking: {
                status: { not: 'CANCELLED' }
              },
              checkInDate: { lte: new Date(date) },
              checkOutDate: { gt: new Date(date) }
            }
          });
          
          return {
            date,
            available: room.availableCount - bookingsOnDate
          };
        })
      );
      
      // Check if room is available for all dates
      const unavailableDates = availability.filter(day => day.available <= 0);
      if (unavailableDates.length > 0) {
        return NextResponse.json(
          { 
            error: 'Room is not available for the selected dates',
            unavailableDates: unavailableDates.map(d => d.date)
          },
          { status: 409 }
        );
      }
      
      // Calculate hotel price
      const hotelPrice = room.price * nights;
      totalPrice += hotelPrice;
      
      // If no currency set yet, use hotel currency
      if (!currency && room.currency) {
        currency = room.currency;
      }
      
      // Prepare hotel booking data
      hotelBookingData = {
        hotelId,
        roomId,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        guestCount,
        price: hotelPrice,
        currency: room.currency,
        status: 'PENDING'
      };
    }

    // Create the booking record with status PENDING
    const booking = await prisma.booking.create({
      data: {
        userId: user.id,
        bookingReference,
        status: 'PENDING', // Will be updated after checkout
        totalPrice,
        currency,
        flights: {
          create: flightBookingData
        },
        hotelBookings: hotelBookingData ? {
          create: hotelBookingData
        } : undefined
      },
      include: {
        flights: true,
        hotelBookings: {
          include: {
            hotel: true,
            room: true
          }
        }
      }
    });
    
    // If just saving the itinerary without checkout
    if (saveItinerary) {
      return NextResponse.json({
        ...booking,
        message: 'Itinerary saved successfully. Proceed to checkout to complete booking.'
      });
    }
    
    // Otherwise, return the booking to proceed to checkout
    return NextResponse.json(booking);
    
  } catch (error) {
    console.error('Itinerary creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create itinerary', details: error.message },
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
  
      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');
      
      // If an ID is provided, get that specific itinerary
      if (id) {
        const itinerary = await prisma.booking.findUnique({
          where: {
            id,
            userId: user.id,
            status: 'PENDING'  // Only fetch pending bookings as drafts
          },
          include: {
            flights: true,
            hotelBookings: {
              include: {
                hotel: true,
                room: true
              }
            }
          }
        });
        
        if (!itinerary) {
          return NextResponse.json(
            { error: 'Itinerary not found' },
            { status: 404 }
          );
        }
        
        return NextResponse.json(itinerary);
      }
      
      // Otherwise get all drafts for this user
      const draftItineraries = await prisma.booking.findMany({
        where: {
          userId: user.id,
          status: 'PENDING'
        },
        include: {
          flights: true,
          hotelBookings: {
            include: {
              hotel: true,
              room: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      
      return NextResponse.json(draftItineraries);
    } catch (error) {
      console.error('Get itineraries error:', error);
      return NextResponse.json(
        { error: 'Failed to get itineraries', details: error.message },
        { status: 500 }
      );
    }
  }

// Helper function to get all dates in a range
function getDatesInRange(startDate, endDate) {
  const dates = [];
  const currentDate = new Date(startDate);
  
  while (currentDate < endDate) {
    dates.push(currentDate.toISOString().split('T')[0]);
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return dates;
}
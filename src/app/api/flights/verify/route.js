import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
// If you have a flight API integration:
// import { retrieveBooking } from '@/lib/afs-api';

export async function GET(request) {
  try {
    // Authentication check
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const user = await verifyToken(token);
    
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const bookingReference = searchParams.get('reference');
    const lastName = searchParams.get('lastName');
    
    if (!bookingReference || !lastName) {
      return NextResponse.json(
        { error: 'Booking reference and last name are required' }, 
        { status: 400 }
      );
    }
    
    // Get flight booking from database
    const flightBooking = await prisma.flightBooking.findFirst({
        where: {
          booking: {
            bookingReference: {
              equals: bookingReference,
            },
            user: {
              lastName: {
                contains: lastName,
              }
            }
          }
        },
        include: {
          booking: true
        }
      });
    
      console.log('Found booking:', flightBooking);
    
    if (!flightBooking) {
      return NextResponse.json({ error: 'Flight booking not found' }, { status: 404 });
    }
    
    // In a real implementation, you would call an airline API here
    // For now, simulate a check with mock data
    const flightStatus = {
      verified: true,
      flightNumber: flightBooking.flightNumber,
      departureTime: flightBooking.departureTime,
      arrivalTime: flightBooking.arrivalTime,
      status: "ON_TIME", // Possible values: ON_TIME, DELAYED, CANCELLED
      gate: "A12",
      terminalChanges: false,
      scheduledChanges: false
    };
    
    return NextResponse.json(flightStatus);
  } catch (error) {
    console.error('Flight verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify flight details', details: error.message },
      { status: 500 }
    );
  }
}
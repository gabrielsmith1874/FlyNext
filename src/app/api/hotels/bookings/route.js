import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateBookingReference } from '@/lib/utils';
import { verifyToken } from '@/lib/auth';

export async function POST(request) {
  try {
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    // Extract token and remove 'Bearer ' prefix
    const token = authHeader.split(' ')[1];
    
    // Pass just the token to authenticate
    const user = verifyToken(token);

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { hotelId, roomId, checkInDate, checkOutDate, guestCount } = body;
    
    // Validate required fields
    if (!hotelId || !roomId || !checkInDate || !checkOutDate || !guestCount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Validate checkout date is not before checkin date
    if (new Date(checkOutDate) <= new Date(checkInDate)) {
      return NextResponse.json(
        { error: 'Checkout date must be after checkin date' },
        { status: 400 }
      );
    }
    
    // Get room
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
    
        // Create an array of all dates in the booking range
        const dateRange = getDatesInRange(new Date(checkInDate), new Date(checkOutDate));
    
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
    
    // Calculate number of nights
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    
    // Calculate total price
    const totalPrice = room.price * nights;
    
    // Create booking reference
    const bookingReference = generateBookingReference();
    
    // Use transaction to create booking and decrease room availability atomically
    const booking = await prisma.$transaction(async (prisma) => {
      // Instead of globally decrementing availableCount,
      // we'll create date-specific availability records
      
      // Get the room details first (we still need this)
      const room = await prisma.room.findUnique({
        where: { id: roomId },
        include: { hotel: true }
      });
      
      // Create booking
      return await prisma.booking.create({
        data: {
          userId: user.id,
          bookingReference,
          status: 'CONFIRMED',
          totalPrice,
          currency: room.currency,
          hotelBookings: {
            create: {
              hotelId,
              roomId,
              checkInDate: new Date(checkInDate),
              checkOutDate: new Date(checkOutDate),
              guestCount,
              price: totalPrice,
              currency: room.currency,
              status: 'CONFIRMED'
            }
          }
        },
        include: {
          hotelBookings: {
            include: {
              hotel: true,
              room: true
            }
          }
        }
      });
    });
    
    // Create notification for user
    await prisma.notification.create({
      data: {
        userId: user.id,
        message: `Your hotel booking at ${room.hotel.name} has been confirmed.`,
        type: 'BOOKING_CONFIRMATION'
      }
    });
    
    // Create notification for hotel owner
    await prisma.notification.create({
      data: {
        userId: room.hotel.ownerId,
        message: `New booking received for ${room.type} room.`,
        type: 'NEW_BOOKING'
      }
    });
    
    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    console.error('Hotel booking error:', error);
    return NextResponse.json(
      { error: 'Booking failed' },
      { status: 500 }
    );
  }
}

function getDatesInRange(startDate, endDate) {
  const dates = [];
  const currentDate = new Date(startDate);
  
  while (currentDate < endDate) {
    dates.push(currentDate.toISOString().split('T')[0]);
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return dates;
}
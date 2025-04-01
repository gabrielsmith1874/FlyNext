import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateBookingReference } from '@/lib/utils';
import { verifyToken } from '@/lib/auth';

export async function POST(request) {
  try {
    // Get user from token
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
    
    // Get request body
    const { 
      hotelId, 
      roomId, 
      checkInDate, 
      checkOutDate, 
      guestCount = 1,
      guestDetails = {}, // Make guest details optional
      status: requestedStatus 
    } = await request.json();
    
    // Validate required fields - don't require guest details
    if (!hotelId || !roomId || !checkInDate || !checkOutDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Validate checkout date is not before checkin date
    // Fix timezone issues by using date strings in YYYY-MM-DD format
    const checkInParts = checkInDate.split('T')[0].split('-');
    const checkOutParts = checkOutDate.split('T')[0].split('-');
    
    // Create date objects with the correct timezone handling
    // By using UTC methods, we ensure no timezone conversion happens
    const checkInDateObj = new Date(Date.UTC(
      parseInt(checkInParts[0]), 
      parseInt(checkInParts[1]) - 1, 
      parseInt(checkInParts[2])
    ));
    
    const checkOutDateObj = new Date(Date.UTC(
      parseInt(checkOutParts[0]), 
      parseInt(checkOutParts[1]) - 1, 
      parseInt(checkOutParts[2])
    ));
    
    if (checkOutDateObj <= checkInDateObj) {
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
    const dateRange = getDatesInRange(checkInDateObj, checkOutDateObj);
    
    // Check availability for each date in the range
    const availability = await Promise.all(
      dateRange.map(async (date) => {
        const currentDate = new Date(date + 'T00:00:00');
        
        // Calculate bookings for this date
        const bookingsOnDate = await prisma.hotelBooking.count({
          where: {
            roomId,
            status: 'CONFIRMED',
            booking: {
              status: { not: 'CANCELLED' }
            },
            checkInDate: { lte: currentDate },
            checkOutDate: { gt: currentDate }
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
    const nights = Math.ceil((checkOutDateObj - checkInDateObj) / (1000 * 60 * 60 * 24));
    
    // Calculate total price
    const totalPrice = room.price * nights;
    
    // Check if an existing pending booking exists for this user
    const existingBooking = await prisma.booking.findFirst({
      where: { 
        userId: user.id, 
        status: 'PENDING' 
      },
      include: {
        hotelBookings: true,
        flights: true
      }
    });
    
    // Use transaction to either add to existing booking or create a new one
    const booking = await prisma.$transaction(async (prisma) => {
      // Get the room details first
      const room = await prisma.room.findUnique({
        where: { id: roomId },
        include: { hotel: true }
      });
      
      if (existingBooking) {
        // Add to existing booking
        const hotelBooking = await prisma.hotelBooking.create({
          data: {
            bookingId: existingBooking.id,
            hotelId,
            roomId,
            // Store dates in the original format without timezone conversion
            checkInDate: `${checkInDate.split('T')[0]}T00:00:00.000Z`,
            checkOutDate: `${checkOutDate.split('T')[0]}T00:00:00.000Z`,
            guestCount,
            price: totalPrice,
            currency: room.currency,
            status: requestedStatus || 'PENDING'
          },
          include: {
            hotel: true,
            room: true
          }
        });
        
        // Update the total price of the existing booking
        const updatedBooking = await prisma.booking.update({
          where: { id: existingBooking.id },
          data: { 
            totalPrice: existingBooking.totalPrice + totalPrice 
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
        
        return updatedBooking;
      } else {
        // Create booking reference for new booking
        const bookingReference = generateBookingReference();
        
        // Create a new booking
        return await prisma.booking.create({
          data: {
            userId: user.id,
            bookingReference,
            status: requestedStatus || 'PENDING',
            totalPrice,
            currency: room.currency,
            hotelBookings: {
              create: {
                hotelId,
                roomId,
                // Store dates in the original format without timezone conversion
                checkInDate: `${checkInDate.split('T')[0]}T00:00:00.000Z`,
                checkOutDate: `${checkOutDate.split('T')[0]}T00:00:00.000Z`,
                guestCount,
                price: totalPrice,
                currency: room.currency,
                status: requestedStatus || 'PENDING',
                // Store guest details as JSON string if provided
                guestDetails: Object.keys(guestDetails).length > 0 ? JSON.stringify(guestDetails) : null
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
      }
    });
    
    // Create notification for user - only for confirmed bookings
    if (booking.status === 'CONFIRMED') {
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
    } else {
      // Optional: Create a different notification for pending/cart bookings
      await prisma.notification.create({
        data: {
          userId: user.id,
          message: `Hotel booking at ${room.hotel.name} has been added to your cart.`,
          type: 'BOOKING_CART_ADDITION'
        }
      });
    }
    
    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    console.error('Hotel booking error:', error);
    return NextResponse.json(
      { error: 'Booking failed' },
      { status: 500 }
    );
  }
}

// Improved date range function that handles timezone issues
function getDatesInRange(startDate, endDate) {
  const dates = [];
  const currentDate = new Date(startDate);
  currentDate.setHours(0, 0, 0, 0); // Reset time to midnight
  
  const endDateCopy = new Date(endDate);
  endDateCopy.setHours(0, 0, 0, 0); // Reset time to midnight
  
  // Changed from < to <= to include the checkout date in the range
  while (currentDate <= endDateCopy) {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    dates.push(`${year}-${month}-${day}`);
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return dates;
}
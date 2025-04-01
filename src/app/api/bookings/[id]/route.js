import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function GET(request, { params }) {
  try {
    // Get and verify token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
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
    
    const { id } = params;
    
    // Get booking
    const booking = await prisma.booking.findUnique({
      where: { id },
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
    
    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }
    
    // Check if booking belongs to user
    if (booking.userId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }
    
    return NextResponse.json(booking);
  } catch (error) {
    console.error('Get booking error:', error);
    return NextResponse.json(
      { error: 'Failed to get booking' },
      { status: 500 }
    );
  }
}

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
    
    const { id } = params;
    
    // Get booking
    const booking = await prisma.booking.findUnique({
      where: { id },
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
    
    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }
    
    // Check if booking belongs to user
    if (booking.userId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }
    
    return NextResponse.json(booking);
  } catch (error) {
    console.error('Get booking error:', error);
    return NextResponse.json(
      { error: 'Failed to get booking' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
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
    
    const { id } = params;
    
    // Get booking with related hotel booking information and hotel details
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        hotelBookings: {
          include: {
            hotel: true,
            room: true
          }
        }
      }
    });
    
    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }
    
    // Check if user is the booking owner, admin, or owner of the hotel
    const isBookingOwner = booking.userId === user.id;
    const isAdmin = user.role === 'ADMIN';
    
    // Check if user is the hotel owner for any of the booked hotels
    let isHotelOwner = false;
    if (booking.hotelBookings && booking.hotelBookings.length > 0) {
      isHotelOwner = booking.hotelBookings.some(
        hotelBooking => hotelBooking.hotel && hotelBooking.hotel.ownerId === user.id
      );
    }
    
    if (!isBookingOwner && !isAdmin && !isHotelOwner) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }
    
    // Check if booking is already cancelled
    if (booking.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Booking is already cancelled' },
        { status: 400 }
      );
    }
    
    // Use transaction to update booking status and handle room availability by date range
    const updatedBooking = await prisma.$transaction(async (prisma) => {
      // If this is a hotel booking, update room availability
      if (booking.hotelBookings && booking.hotelBookings.length > 0) {
        for (const hotelBooking of booking.hotelBookings) {
          // Only update availability if the hotel booking status is CONFIRMED
          if (hotelBooking.status === 'CONFIRMED') {
            // Get the date range for this booking
            const checkInDate = new Date(hotelBooking.checkInDate);
            const checkOutDate = new Date(hotelBooking.checkOutDate);
            
            // Update hotel booking status
            await prisma.hotelBooking.update({
              where: { id: hotelBooking.id },
              data: { status: 'CANCELLED' }
            });
          }
        }
      }
      
      // Update booking status
      return await prisma.booking.update({
        where: { id },
        data: { status: 'CANCELLED' }
      });
    });
    
    // Create notification
    await prisma.notification.create({
      data: {
        userId: user.id,
        message: `Your booking (${booking.bookingReference}) has been cancelled.`,
        type: 'BOOKING_CANCELLATION'
      }
    });
    
    return NextResponse.json(updatedBooking);
  } catch (error) {
    console.error('Cancel booking error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel booking' },
      { status: 500 }
    );
  }
}

// Helper function to get all dates in a range (duplicated from rooms route)
function getDatesInRange(startDate, endDate) {
  const dates = [];
  const currentDate = new Date(startDate);
  
  while (currentDate < endDate) {
    dates.push(currentDate.toISOString().split('T')[0]);
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return dates;
}
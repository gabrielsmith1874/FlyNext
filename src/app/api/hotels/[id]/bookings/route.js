import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function GET(request, { params }) {
  try {
    // Extract hotel ID from params
    const { id: hotelId } = params;
    
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
    
    // Get hotel
    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId }
    });
    
    if (!hotel) {
      return NextResponse.json(
        { error: 'Hotel not found' },
        { status: 404 }
      );
    }
    
    // Check if user is hotel owner or admin
    if (hotel.ownerId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }
    
    // Extract filter parameters without defaulting if they aren’t provided
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const statusParam = searchParams.get('status');
    
    // Build booking filter only if filters are provided
    const bookingFilter = {};
    if (startDateParam && endDateParam) {
      bookingFilter.OR = [
        {
          checkInDate: {
            gte: new Date(startDateParam)
          },
          checkInDate: {
            lte: new Date(endDateParam)
          }
        },
        {
          checkOutDate: {
            gte: new Date(startDateParam)
          },
          checkOutDate: {
            lte: new Date(endDateParam)
          }
        },
        {
          checkInDate: { lte: new Date(startDateParam) },
          checkOutDate: { gte: new Date(endDateParam) }
        }
      ];
    }
    if (statusParam) {
      bookingFilter.status = statusParam;
    }
    
    // Get rooms with bookings (if no filter provided, bookingFilter remains empty and returns all bookings)
    const roomsWithBookings = await prisma.room.findMany({
      where: { hotelId },
      include: {
        bookings: {
          where: {
            ...bookingFilter
          },
          include: {
            booking: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                    email: true
                  }
                }
              }
            }
          }
        }
      }
    });
    
    // Flatten bookings from rooms and attach room information
    const bookings = roomsWithBookings.flatMap(room => 
      room.bookings.map(booking => ({
        ...booking,
        room: {
          id: room.id,
          type: room.type,
          hotelId: room.hotelId,
          description: room.description,
          price: room.price,
          currency: room.currency,
          amenities: room.amenities,
          availableCount: room.availableCount,
          maxGuests: room.maxGuests
        }
      }))
    );
    
    return NextResponse.json(bookings);
  } catch (error) {
    console.error('Get hotel bookings error:', error);
    return NextResponse.json(
      { error: 'Failed to get hotel bookings' },
      { status: 500 }
    );
  }
}

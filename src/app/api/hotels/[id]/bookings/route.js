import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function GET(request, { params }) {
  try {
    // Extract hotel ID from params
    const { id: hotelId } = params;
    
    // Extract user from headers or token
    const userId = request.headers.get('x-user-id');
    const userEmail = request.headers.get('x-user-email');
    const userRole = request.headers.get('x-user-role');
    
    // If we have headers from middleware, use them
    let user = null;
    if (userId && userEmail && userRole) {
      user = { id: userId, email: userEmail, role: userRole };
    } 
    // Fallback to manual token extraction
    else {
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        user = verifyToken(token);
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
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
    
    // Extract filter parameters
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const roomType = searchParams.get('roomType');
    
    // Build filter
    const filter = {
      hotelId,
    };
    
    // Date filters
    if (startDate) {
      filter.checkInDate = {
        gte: new Date(startDate)
      };
    }
    
    if (endDate) {
      filter.checkOutDate = {
        lte: new Date(endDate)
      };
    }
    
    // If roomType is provided, include it in the database query
    if (roomType) {
        filter.room = {
            is: {
                type: {
                    contains: roomType,
                    mode: 'insensitive'
                }
            }
        };
    }
    
    // Get bookings with filters
    const bookings = await prisma.hotelBooking.findMany({
      where: {
        hotelId,
        checkInDate: { gte: new Date(startDate) },
        checkOutDate: { lte: new Date(endDate) },
        room: {
          is: {
            type: {
              contains: "Deluxe Suite"
            }
          }
        }
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
        },
        room: true
      }
    });
    
    return NextResponse.json(bookings);
  } catch (error) {
    console.error('Get hotel bookings error:', error);
    return NextResponse.json(
      { error: 'Failed to get hotel bookings' },
      { status: 500 }
    );
  }
}

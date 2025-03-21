import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function GET(request, { params }) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Extract and verify token
    const token = authHeader.split(' ')[1];
    const user = verifyToken(token);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }
    
    const { id } = params;
    
    // Get hotel
    const hotel = await prisma.hotel.findUnique({
      where: { id }
    });
    
    if (!hotel) {
      return NextResponse.json(
        { error: 'Hotel not found' },
        { status: 404 }
      );
    }
    
    // Check if hotel belongs to user or user is admin
    if (hotel.ownerId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'You are not authorized to view these bookings' },
        { status: 403 }
      );
    }
    
    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const roomId = searchParams.get('roomId');
    
    // Build filter conditions
    let whereConditions = {
      room: {
        hotelId: id
      }
    };
    
    if (status) {
      whereConditions.status = status.toUpperCase();
    }
    
    if (roomId) {
      whereConditions.roomId = roomId;
    }
    
    // Get bookings
    const bookings = await prisma.booking.findMany({
      where: whereConditions,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        room: {
          include: {
            images: true
          }
        }
      },
      orderBy: {
        checkInDate: 'asc'
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

export async function PUT(request, { params }) {
  try {
    // Authentication checks (similar to hotel routes)
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const user = verifyToken(token);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }
    
    const { id } = params;
    
    // Get room
    const room = await prisma.room.findUnique({
      where: { id },
      include: {
        hotel: true
      }
    });
    
    if (!room) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      );
    }
    
    // Check if room belongs to user's hotel or user is admin
    if (room.hotel.ownerId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const { name, description, price, capacity, type, availability, images } = body;
    
    // Check if availability is being reduced
    if (availability !== undefined && availability < room.availability) {
      // Count active bookings for this room
      const activeBookingsCount = await prisma.booking.count({
        where: {
          roomId: id,
          status: 'ACTIVE',
          endDate: {
            gte: new Date()
          }
        }
      });
      
      // If reducing availability would affect existing bookings
      if (activeBookingsCount > availability) {
        // Get active bookings ordered by creation date (oldest first)
        const bookingsToKeep = await prisma.booking.findMany({
          where: {
            roomId: id,
            status: 'ACTIVE',
            endDate: {
              gte: new Date()
            }
          },
          orderBy: {
            createdAt: 'asc'
          },
          take: availability
        });
        
        const bookingIdsToKeep = bookingsToKeep.map(booking => booking.id);
        
        // Cancel excess bookings
        const cancelledBookings = await prisma.booking.updateMany({
          where: {
            roomId: id,
            status: 'ACTIVE',
            endDate: {
              gte: new Date()
            },
            id: {
              notIn: bookingIdsToKeep
            }
          },
          data: {
            status: 'CANCELLED',
            cancelledAt: new Date(),
            cancellationReason: 'Room availability reduced by hotel owner'
          }
        });
        
        console.log(`Cancelled ${cancelledBookings.count} bookings due to reduced availability`);
      }
    }
    
    // Update room
    const updatedRoom = await prisma.room.update({
      where: { id },
      data: {
        name,
        description,
        price,
        capacity,
        type,
        availability
      },
      include: {
        images: true,
        hotel: true
      }
    });
    
    // Update images if provided
    if (images && images.length > 0) {
      // Delete existing images
      await prisma.roomImage.deleteMany({
        where: { roomId: id }
      });
      
      // Create new images
      await prisma.roomImage.createMany({
        data: images.map(image => ({
          roomId: id,
          url: image.url,
          caption: image.caption
        }))
      });
    }
    
    return NextResponse.json(updatedRoom);
  } catch (error) {
    console.error('Update room error:', error);
    return NextResponse.json(
      { error: 'Failed to update room' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Extract and verify token
    const token = authHeader.split(' ')[1];
    const user = verifyToken(token);
    
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
        room: {
          include: {
            hotel: true
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
    
    // Check if user is the booking owner, hotel owner, or admin
    const isHotelOwner = booking.room.hotel.ownerId === user.id;
    const isBookingOwner = booking.userId === user.id;
    const isAdmin = user.role === 'ADMIN';
    
    if (!isBookingOwner && !isHotelOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'You are not authorized to cancel this booking' },
        { status: 403 }
      );
    }
    
    // Delete booking
    await prisma.booking.delete({
      where: { id }
    });
    
    return NextResponse.json({ 
      success: true,
      message: 'Booking cancelled successfully'
    }, { status: 200 });
  } catch (error) {
    console.error('Delete booking error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel booking' },
      { status: 500 }
    );
  }
}
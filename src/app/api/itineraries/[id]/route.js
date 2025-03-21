import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function GET(request, { params }) {
  try {
    // Get authorization token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
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
    
    // Get booking with related information
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        flights: true,
        hotelBookings: {
          include: {
            hotel: {
              include: {
                images: true
              }
            },
            room: {
              include: {
                images: true
              }
            }
          }
        },
        payment: true
      }
    });
    
    if (!booking) {
      return NextResponse.json(
        { error: 'Itinerary not found' },
        { status: 404 }
      );
    }
    
    // Check if user owns this booking
    if (booking.userId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }
    
    return NextResponse.json(booking);
    
  } catch (error) {
    console.error('Get itinerary error:', error);
    return NextResponse.json(
      { error: 'Failed to get itinerary' },
      { status: 500 }
    );
  }
}
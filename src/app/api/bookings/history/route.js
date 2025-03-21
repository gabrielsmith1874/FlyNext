import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

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
    
    // Get booking history for user, ordered by creation date
    const bookingHistory = await prisma.booking.findMany({
      where: { 
        userId: user.id
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
    
    return NextResponse.json(bookingHistory);
  } catch (error) {
    console.error('Get booking history error:', error);
    return NextResponse.json(
      { error: 'Failed to get booking history' },
      { status: 500 }
    );
  }
}
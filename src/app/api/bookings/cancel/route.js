import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function POST(request) {
  try {
    // Get and verify token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const user = await verifyToken(token);
    
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { bookingId, bookingReference, lastName } = body;

    if (!bookingId || !bookingReference || !lastName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify booking belongs to user
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        flights: true,
        user: {
          select: {
            id: true,
            lastName: true
          }
        }
      }
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Check if user owns this booking or is admin
    if (booking.userId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'You are not authorized to cancel this booking' }, { status: 403 });
    }

    // Cancel booking with AFS API
    const afsApiKey = process.env.AFS_API_KEY;
    const afsBaseUrl = process.env.AFS_BASE_URL || 'http://localhost:3001';

    // Call AFS API to cancel the booking
    const cancelResponse = await fetch(`${afsBaseUrl}/api/bookings/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': afsApiKey
      },
      body: JSON.stringify({
        lastName: lastName,
        bookingReference: bookingReference
      })
    });

    if (!cancelResponse.ok) {
      const errorData = await cancelResponse.json().catch(() => ({}));
      console.error('AFS cancellation error:', errorData);
      return NextResponse.json({ 
        error: 'Failed to cancel booking with airline', 
        details: errorData.error || cancelResponse.statusText 
      }, { status: cancelResponse.status });
    }

    const cancelResult = await cancelResponse.json();

    // Update booking status in database
    await prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'CANCELLED' }
    });

    // Update flight booking statuses
    await prisma.flightBooking.updateMany({
      where: { bookingId: bookingId },
      data: { status: 'CANCELLED' }
    });

    // Create notification for user
    await prisma.notification.create({
      data: {
        userId: user.id,
        message: `Your booking ${bookingReference} has been cancelled successfully.`,
        type: 'BOOKING_CANCELLATION'
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Booking cancelled successfully',
      details: cancelResult
    });
  } catch (error) {
    console.error('Cancel booking error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel booking', details: error.message },
      { status: 500 }
    );
  }
}

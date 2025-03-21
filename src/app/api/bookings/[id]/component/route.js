import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    const { componentType, componentId } = await request.json();
    
    // Authentication & authorization checks
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const user = await verifyToken(token);
    
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    // Get booking with components
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        flights: true,
        hotelBookings: true
      }
    });
    
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }
    
    // Check authorization
    if (booking.userId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Handle component cancellation
    if (componentType === 'flight' && componentId) {
      await prisma.flightBooking.update({
        where: { id: componentId },
        data: { status: 'CANCELLED' }
      });
    } else if (componentType === 'hotel' && componentId) {
      await prisma.hotelBooking.update({
        where: { id: componentId },
        data: { status: 'CANCELLED' }
      });
    } else {
      return NextResponse.json({ error: 'Invalid component type or ID' }, { status: 400 });
    }

    // Create notification
    await prisma.notification.create({
      data: {
        userId: user.id,
        message: `A ${componentType} from your booking (${booking.bookingReference}) has been cancelled.`,
        type: 'BOOKING_COMPONENT_CANCELLATION'
      }
    });
    
    return NextResponse.json({ 
      success: true, 
      message: `${componentType} cancelled successfully` 
    });
  } catch (error) {
    console.error('Component cancellation error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel booking component' },
      { status: 500 }
    );
  }
}
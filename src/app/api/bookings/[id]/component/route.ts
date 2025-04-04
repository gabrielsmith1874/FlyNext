import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    const { componentType, componentIds } = await request.json(); // Accept an array of component IDs
    console.log('Received componentType:', componentType);
    console.log('Received componentIds:', componentIds);

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

    console.log('componentIds:', componentIds);
    console.log('componentType:', componentType);

    if (componentType === 'flight') {
      // Cancel all flights in the array
      const updatedBookings = await prisma.flightBooking.updateMany({
        where: { flightId: { in: componentIds } },
        data: { status: 'CANCELLED' },
      });

      console.log('Updated Bookings:', updatedBookings);

      // Send cancellation request to AFS database
      const afsResponse = await fetch(`${process.env.AFS_BASE_URL}/api/bookings/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.AFS_API_KEY,
        },
        body: JSON.stringify({
          bookingReference: id,
          flightIds: componentIds,
        }),
      });

      if (!afsResponse.ok) {
        const afsError = await afsResponse.json();
        console.error('AFS cancellation error:', afsError);
        return NextResponse.json(
          { error: 'Failed to cancel booking in AFS database', details: afsError },
          { status: 500 }
        );
      }

      const afsResult = await afsResponse.json();
      console.log('AFS cancellation result:', afsResult);

      return NextResponse.json({
        message: 'Flights cancelled successfully',
        bookings: updatedBookings,
      });
    }

    return NextResponse.json({ error: 'Invalid component type' }, { status: 400 });
  } catch (error) {
    console.error('Component cancellation error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel booking component', details: error.message },
      { status: 500 }
    );
  }
}
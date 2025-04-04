import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { generateInvoice } from '@/lib/pdf-gen';

export async function GET(request, { params }) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await verifyToken(token);

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const { id } = params;

    // Get booking with all related data
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        user: true,
        flights: {
          select: {
            id: true,
            flightId: true,
            flightNumber: true,
            airline: true,
            origin: true,
            destination: true,
            departureTime: true,
            arrivalTime: true,
            price: true,
            currency: true,
            status: true
          }
        },
        hotelBookings: {
          include: {
            hotel: true,
            room: true
          }
        },
        payment: true
      }
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Check if booking belongs to user or user is admin
    if (booking.userId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Generate PDF invoice
    const pdfBuffer = await generateInvoice(booking);

    // Return PDF as response with appropriate headers
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${booking.bookingReference || id}.pdf"`,
      },
    });

  } catch (error) {
    console.error('Generate invoice error:', error);
    return NextResponse.json(
      { error: `Failed to generate invoice: ${error.message}` },
      { status: 500 }
    );
  }
}
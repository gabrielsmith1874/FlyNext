import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    console.log(`Deleting component from booking: ${id}`);
    
    const { componentType, componentId } = await request.json();
    console.log(`Component details: type=${componentType}, id=${componentId}`);
    
    // Authentication & authorization checks
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    console.log("DELETE Token received:", token.substring(0, 15) + "...");
    
    const decodedToken = await verifyToken(token);
    if (!decodedToken) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    console.log("DELETE Decoded token user ID:", decodedToken.id);
    
    // Verify that the user exists in the database
    let user;
    try {
      user = await prisma.user.findUnique({
        where: { id: decodedToken.id }
      });
      
      if (!user && decodedToken.email) {
        // Try to find user by email if ID lookup fails
        user = await prisma.user.findUnique({
          where: { email: decodedToken.email }
        });
        console.log("User found by email instead of ID");
      }
    } catch (dbError) {
      console.error("Database error when finding user:", dbError);
      return NextResponse.json({ 
        error: 'Database error', 
        details: dbError.message 
      }, { status: 500 });
    }
    
    if (!user) {
      console.log("User not found for ID:", decodedToken.id);
      console.log("Token payload:", JSON.stringify(decodedToken));
      return NextResponse.json({ 
        error: 'User not found',
        userId: decodedToken.id
      }, { status: 404 });
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
      return NextResponse.json({ error: 'Booking not found', bookingId: id }, { status: 404 });
    }
    
    console.log(`Booking found: userId=${booking.userId}, userRole=${user.role}`);
    
    // DEBUGGING: Allow all operations during development
    if (process.env.NODE_ENV === 'development') {
      console.log("Development mode: bypassing user authorization check");
    }
    // Normal authorization check for production
    else if (booking.userId !== user.id && user.role !== 'ADMIN') {
      console.log(`Authorization failed: booking.userId (${booking.userId}) !== user.id (${user.id})`);
      console.log(`User role: ${user.role}`);
      return NextResponse.json({ 
        error: 'Forbidden', 
        details: 'You are not authorized to modify this booking' 
      }, { status: 403 });
    }

    // Handle component cancellation/cleanup:
    if (componentType === 'flight' && componentId) {
      const flightBooking = await prisma.flightBooking.findUnique({
        where: { id: componentId }
      });
      
      if (!flightBooking) {
        return NextResponse.json({ error: 'Flight booking not found' }, { status: 404 });
      }
      
      // Check if this is part of a connecting flight group
      if (flightBooking.status && flightBooking.status.includes(':CONNECTION_REF:')) {
        // Delete this specific flight segment
        await prisma.flightBooking.delete({
          where: { id: componentId }
        });
        
        // Check if there are other segments with the same connection reference
        const connectionRefMatch = flightBooking.status.match(/:CONNECTION_REF:([^:]+):/);
        if (connectionRefMatch && connectionRefMatch[1]) {
          const connectionRef = connectionRefMatch[1];
          
          // Log the connection being processed
          console.log(`Processing connecting flight cancellation with ref: ${connectionRef}`);
        }
      } else {
        // Regular single flight - just delete it
        await prisma.flightBooking.delete({
          where: { id: componentId }
        });
      }
    } else if (componentType === 'hotel' && componentId) {
      // Delete hotel booking entry completely instead of marking as CANCELLED
      await prisma.hotelBooking.delete({
        where: { id: componentId }
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

    // After removing the component, check if any components remain.
    const remainingFlights = await prisma.flightBooking.count({
      where: { bookingId: booking.id }
    });
    const remainingHotelBookings = await prisma.hotelBooking.count({
      where: { bookingId: booking.id }
    });
    
    if (remainingFlights === 0 && remainingHotelBookings === 0) {
      // If no components remain, remove the entire booking
      await prisma.booking.delete({
        where: { id: booking.id }
      });
      return NextResponse.json({
        success: true,
        message: 'All booking components removed; booking deleted successfully'
      });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `${componentType} cancelled successfully` 
    });
  } catch (error) {
    console.error('Component cancellation error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel booking component', details: error.message },
      { status: 500 }
    );
  }
}
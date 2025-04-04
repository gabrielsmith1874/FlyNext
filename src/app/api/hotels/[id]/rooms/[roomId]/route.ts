import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

export async function GET(request, { params }) {
  const resolvedParams = await params; // await params before use
  const { id: hotelId, roomId } = resolvedParams;
  
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
    
    // Get room
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: { images: true }
    });
    
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }
    
    // Get hotel to check ownership
    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId }
    });
    
    if (!hotel) {
      return NextResponse.json({ error: 'Hotel not found' }, { status: 404 });
    }
    
    // Check if user is hotel owner or admin
    if (hotel.ownerId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    return NextResponse.json(room);
  } catch (error) {
    console.error('Get room error:', error);
    return NextResponse.json(
      { error: 'Failed to get room' },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  const resolvedParams = await params; // await params before use
  const { id: hotelId, roomId } = resolvedParams;
  
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
    
    // Get hotel to check ownership
    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId }
    });
    
    if (!hotel) {
      return NextResponse.json({ error: 'Hotel not found' }, { status: 404 });
    }
    
    // Check if user is hotel owner or admin
    if (hotel.ownerId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Parse the form data
    const formData = await request.formData();
    const newAvailableCount = parseInt(formData.get('availableCount'), 10);
    
    // Get the current room with its bookings
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        bookings: {
          where: { 
            booking: {
              status: 'CONFIRMED'
            }
          },
          include: {
            booking: true
          }
        }
      }
    });
    
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }
    
    // Check if we need to cancel bookings
    const activeBookings = room.bookings || [];
    let bookingsToCancel = []; // Declare variable in outer scope
    
    if (activeBookings.length > newAvailableCount) {
      console.log(`Cancelling bookings: Room has ${activeBookings.length} bookings but new available count is ${newAvailableCount}`);
      
      // Sort bookings by check-out date (furthest in the future first)
      const sortedBookings = [...activeBookings].sort((a, b) => 
        new Date(b.booking.checkOutDate) - new Date(a.booking.checkOutDate)
      );
      
      // Select bookings to cancel (the difference between current bookings and new available count)
      const bookingsToSlice = Math.min(activeBookings.length, activeBookings.length - newAvailableCount);
      bookingsToCancel = sortedBookings.slice(0, bookingsToSlice);
      
      console.log(`Selected ${bookingsToCancel.length} bookings to cancel`);
      
      // Cancel each booking
      for (const bookingRoom of bookingsToCancel) {
        if (bookingRoom && bookingRoom.booking && bookingRoom.booking.id) {
          await prisma.booking.update({
            where: { id: bookingRoom.booking.id },
            data: { 
              status: 'CANCELLED'
            }
          });
          
          console.log(`Cancelled booking ${bookingRoom.booking.id} due to reduced room availability`);
        } else {
          console.warn('Attempted to cancel a booking with invalid data', bookingRoom);
        }
      }
    }
    
    // Get image URLs from form data
    const images = formData.getAll('images');
    console.log('Images from form data:', images);

    // Handle both string URLs and File objects
    const imageUrls = [];

    // Process each image
    for (const img of images) {
      if (typeof img === 'string' && img.trim() !== '') {
        // It's already a URL string
        imageUrls.push(img);
      } else if (img instanceof File) {
        try {
          // Ensure upload directory exists
          const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'rooms');
          fs.mkdirSync(uploadsDir, { recursive: true });
          
          // Generate a unique filename
          const fileName = `${Date.now()}-${img.name}`;
          const filePath = path.join(uploadsDir, fileName);
          
          // Convert File object to ArrayBuffer
          const arrayBuffer = await img.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          
          // Write file to disk
          fs.writeFileSync(filePath, buffer);
          
          // Create URL path that will be accessible from the browser
          const uploadedUrl = `/uploads/rooms/${fileName}`;
          imageUrls.push(uploadedUrl);
          
          console.log(`Saved file to: ${filePath}`);
          console.log(`Created URL: ${uploadedUrl}`);
        } catch (error) {
          console.error(`Error saving file ${img.name}:`, error);
        }
      }
    }

    console.log('Processed image URLs:', imageUrls);
    
    // Update the room with transaction to handle both room update and images
    const updatedRoom = await prisma.$transaction(async (tx) => {
      // First update basic room data
      const updated = await tx.room.update({
        where: { id: roomId },
        data: {
          type: formData.get('type'),
          description: formData.get('description'),
          price: parseFloat(formData.get('price')),
          currency: formData.get('currency'),
          amenities: formData.get('amenities'),
          availableCount: newAvailableCount,
          maxGuests: formData.has('maxGuests') ? parseInt(formData.get('maxGuests'), 10) : undefined,
        }
      });
      
      // Only handle image updates if images are explicitly provided in the form
      if (formData.has('images')) {
        if (imageUrls.length > 0) {
          // Delete existing images
          await tx.roomImage.deleteMany({
            where: { roomId: roomId }
          });
          
          // Create new image records
          await tx.roomImage.createMany({
            data: imageUrls.map(url => ({
              roomId: roomId,
              url: url
            }))
          });
        }
      }
      
      // Return updated room with images
      return tx.room.findUnique({
        where: { id: roomId },
        include: { images: true }
      });
    });
    
    // Return the updated room with information about cancelled bookings
    return NextResponse.json({
      ...updatedRoom,
      cancelledBookings: bookingsToCancel.length > 0 ? {
        count: bookingsToCancel.length,
        message: `${bookingsToCancel.length} future bookings were automatically cancelled due to reduced availability.`
      } : null
    });
  } catch (error) {
    console.error('Update room error:', error);
    return NextResponse.json(
      { error: 'Failed to update room', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id: hotelId, roomId } = params;

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
    
    // Get hotel to check ownership
    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId }
    });
    
    if (!hotel) {
      return NextResponse.json({ error: 'Hotel not found' }, { status: 404 });
    }
    
    // Check if user is hotel owner or admin
    if (hotel.ownerId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update the room's status to "CANCELLED" instead of deleting
    const updatedRoom = await prisma.room.update({
      where: { id: roomId },
      data: { availableCount: 0 } // Set availability to 0 to effectively cancel the room
    });

    // Cancel all associated bookings
    await prisma.hotelBooking.updateMany({
      where: { roomId },
      data: { status: 'CANCELLED' }
    });

    return NextResponse.json({
      success: true,
      message: 'Room availability set to 0 and associated bookings cancelled.'
    });
  } catch (error) {
    console.error('Delete room error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel room', details: error.message },
      { status: 500 }
    );
  }
}

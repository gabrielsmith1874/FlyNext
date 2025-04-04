import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

export async function POST(request, { params }) {
  try {
    // Await params before destructuring
    const resolvedParams = await params;
    const { id: hotelId } = resolvedParams;

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

    // Get form data instead of JSON
    const formData = await request.formData();
    
    // Extract and validate the data
    const type = formData.get('type');
    const description = formData.get('description');
    const price = parseFloat(formData.get('price'));
    const currency = formData.get('currency') || 'USD';
    const amenities = formData.get('amenities') || '';
    const availableCount = parseInt(formData.get('availableCount')) || 1;
    const maxGuestsRaw = formData.get('maxGuests');
    const maxGuests = maxGuestsRaw ? parseInt(maxGuestsRaw.toString()) : null;
    const images = formData.getAll('images');

    // Basic validation
    if (!type || !description || isNaN(price)) {
      return NextResponse.json(
        { error: 'Missing or invalid required fields' },
        { status: 400 }
      );
    }

    // Process images from form data
    console.log('Images from form data:', images);
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

    // Create room with images in a transaction
    const room = await prisma.$transaction(async (tx) => {
      // First create the room
      const newRoom = await tx.room.create({
        data: {
          hotelId,
          type,
          description,
          price,
          currency,
          amenities,
          availableCount,
          maxGuests,
        },
      });
      
      // Then create image records if we have any valid image URLs
      if (imageUrls.length > 0) {
        await tx.roomImage.createMany({
          data: imageUrls.map(url => ({
            roomId: newRoom.id,
            url: url,
          })),
        });
      }
      
      // Return the created room with its images
      return tx.room.findUnique({
        where: { id: newRoom.id },
        include: { images: true }
      });
    });

    return NextResponse.json(room, { status: 201 });

  } catch (error) {
    console.error('Create room error:', error);
    return NextResponse.json(
      { error: 'Failed to create room', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request, context) {
  try {
    const resolvedParams = await context.params; // Await params before accessing
    const { id: hotelId } = resolvedParams;

    // Fetch rooms for the given hotel ID
    const rooms = await prisma.room.findMany({
      where: { hotelId },
      include: {
        images: true, // Include room images
      },
    });

    // Log the fetched rooms for debugging
    console.log('Fetched rooms:', rooms);

    return NextResponse.json({ rooms });
  } catch (error) {
    console.error('Error fetching rooms:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rooms' },
      { status: 500 }
    );
  }
}

// Helper function to get all dates in a range
function getDatesInRange(startDate, endDate) {
  const dates = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    dates.push(currentDate.toISOString().split('T')[0]);
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return dates;
}

export async function PATCH(request, { params }) {
  try {
    // Await params before destructuring
    const resolvedParams = await params;
    const { id: hotelId } = resolvedParams;

    const body = await request.json();
    const { availableCount, startDate, endDate } = body;

    // Get roomId from body
    const roomId = body.roomId;
    
    // First, check if user is authorized
    const userId = request.headers.get('x-user-id');
    const userEmail = request.headers.get('x-user-email'); 
    const userRole = request.headers.get('x-user-role');
    
    // Get user info through middleware headers or auth token
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
    
    // Get the hotel to verify ownership
    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId }
    });
    
    if (!hotel) {
      return NextResponse.json(
        { error: 'Hotel not found' },
        { status: 404 }
      );
    }
    
    // Check if hotel belongs to user
    if (hotel.ownerId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - You do not own this hotel' },
        { status: 403 }
      );
    }

    // Get current room data
    const room = await prisma.room.findUnique({
      where: { id: roomId }
    });

    if (!room) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      );
    }

    // Check if we're updating availability for specific dates
    if (startDate && endDate) {
      // Parse dates
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      // Validate date format
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return NextResponse.json(
          { error: 'Invalid date format. Use YYYY-MM-DD format' },
          { status: 400 }
        );
      }
      
      // Validate date range
      if (end < start) {
        return NextResponse.json(
          { error: 'End date must be after start date' },
          { status: 400 }
        );
      }

      // Get dates in the range
      const datesInRange = getDatesInRange(start, end);
      
      // Check for existing bookings on these dates
      const existingBookings = await prisma.hotelBooking.findMany({
        where: {
          roomId: roomId,
          OR: [
            {
              // Bookings that start within the date range
              checkInDate: {
                gte: start,
                lte: end
              }
            },
            {
              // Bookings that end within the date range
              checkOutDate: {
                gte: start,
                lte: end
              }
            },
            {
              // Bookings that span the entire date range
              checkInDate: { lte: start },
              checkOutDate: { gte: end }
            }
          ],
          booking: {
            status: 'CONFIRMED'
          }
        },
        include: {
          booking: true
        }
      });

      // Count bookings for each day
      const bookingsByDay = {};
      datesInRange.forEach(date => {
        bookingsByDay[date] = 0;
      });
      
      existingBookings.forEach(booking => {
        const bookingStart = new Date(booking.checkInDate);
        const bookingEnd = new Date(booking.checkOutDate);
        
        datesInRange.forEach(date => {
          const currentDate = new Date(date);
          if (currentDate >= bookingStart && currentDate < bookingEnd) {
            bookingsByDay[date]++;
          }
        });
      });
      
      // Update availability for each date
      const newAvailableCount = parseInt(availableCount);
      if (isNaN(newAvailableCount) || newAvailableCount < 0) {
        return NextResponse.json(
          { error: 'Available count must be a non-negative number' },
          { status: 400 }
        );
      }
      
      // Identify dates where bookings exceed new availability
      const datesWithExcessBookings = [];
      for (const date in bookingsByDay) {
        if (bookingsByDay[date] > newAvailableCount) {
          datesWithExcessBookings.push({
            date,
            bookings: bookingsByDay[date],
            excess: bookingsByDay[date] - newAvailableCount
          });
        }
      }
      
      // If there are dates with excess bookings, we need to cancel them
      if (datesWithExcessBookings.length > 0) {
        // Get all bookings that overlap with dates that have excess bookings
        const bookingsToConsider = await prisma.hotelBooking.findMany({
          where: {
            roomId: roomId,
            booking: {
              status: 'CONFIRMED'
            }
          },
          include: {
            booking: true
          },
          orderBy: {
            booking: {
              createdAt: 'desc'  // Cancel the most recent bookings first
            }
          }
        });
        
        // Track which bookings to cancel
        const bookingsToCancel = new Set();
        
        // For each date with excess bookings
        for (const excessDate of datesWithExcessBookings) {
          let bookingsToRemove = excessDate.excess;
          const currentDate = new Date(excessDate.date);
          
          // Find bookings that overlap with this date
          for (const booking of bookingsToConsider) {
            if (bookingsToRemove <= 0) break;
            
            const bookingStart = new Date(booking.checkInDate);
            const bookingEnd = new Date(booking.checkOutDate);
            
            // If this booking overlaps with the current date
            if (currentDate >= bookingStart && currentDate < bookingEnd) {
              // Add it to our cancel set if not already added
              if (!bookingsToCancel.has(booking.booking.id)) {
                bookingsToCancel.add(booking.booking.id);
                bookingsToRemove--;
              }
            }
          }
        }
        console.log(`Cancelling ${bookingsToCancel} bookings due to excess availability on selected dates`);
        
        // Cancel the selected bookings
        if (bookingsToCancel.size > 0) {
          await prisma.booking.updateMany({
            where: { id: { in: Array.from(bookingsToCancel) } },
            data: { status: 'CANCELLED' }
          });
          // NEW: Update associated hotel booking records
          await prisma.hotelBooking.updateMany({
            where: { bookingId: { in: Array.from(bookingsToCancel) } },
            data: { status: 'CANCELLED' }
          });
        }
      }
      
      // Update the room's available count
      const updatedRoom = await prisma.room.update({
        where: {
          id: roomId,
          hotelId: hotelId
        },
        data: { availableCount: newAvailableCount }
      });
      
      return NextResponse.json({
        ...updatedRoom,
        dateRange: {
          startDate,
          endDate
        },
        cancelledBookings: datesWithExcessBookings.length > 0 ? 
          Array.from(new Set(datesWithExcessBookings.map(d => d.excess))).reduce((sum, excess) => sum + excess, 0) : 0
      });
    } else {
      // Handle global availability update (previous behavior)
      const newAvailableCount = parseInt(availableCount);
      
      if (isNaN(newAvailableCount) || newAvailableCount < 0) {
        return NextResponse.json(
          { error: 'Available count must be a non-negative number' },
          { status: 400 }
        );
      }

      // Get active bookings for this room
      const activeHotelBookings = await prisma.hotelBooking.findMany({
        where: {
          roomId: roomId,
          booking: {
            status: 'CONFIRMED'
          }
        },
        include: {
          booking: true
        },
        orderBy: {
          booking: {
            createdAt: 'desc'  // Cancel the most recent bookings first
          }
        }
      });

      console.log(`Found ${activeHotelBookings} active bookings for room ${roomId}`);

      const bookedCount = activeHotelBookings.length;

      // If the new availability is 0, cancel all bookings
      if (newAvailableCount === 0) {
        console.log('Cancelling all bookings as room availability is set to 0');

        // Use a transaction to ensure both booking and hotelBooking updates complete
        await prisma.$transaction(async (tx) => {
          // Find all hotel bookings for this room, regardless of their current status
          const activeBookings = await tx.hotelBooking.findMany({
            where: {
              roomId: roomId,
            },
            select: {
              id: true,
              bookingId: true,
              status: true
            }
          });

          console.log(`Found ${activeBookings.length} hotel bookings to process`);
          
          // Extract booking IDs
          const bookingIds = activeBookings.map(booking => booking.bookingId);
          
          // Cancel all hotel bookings for this room
          const hotelCancellationResult = await tx.hotelBooking.updateMany({
            where: {
              roomId: roomId,
            },
            data: { status: 'CANCELLED' }
          });
          
          console.log(`Updated ${hotelCancellationResult.count} hotel bookings to CANCELLED`);

          // Also cancel the parent booking records
          if (bookingIds.length > 0) {
            const bookingCancellationResult = await tx.booking.updateMany({
              where: {
                id: { in: bookingIds }
              },
              data: { status: 'CANCELLED' }
            });
            
            console.log(`Updated ${bookingCancellationResult.count} parent bookings to CANCELLED`);
          }
          
          // Update the room's available count to 0
          const updatedRoom = await tx.room.update({
            where: {
              id: roomId,
              hotelId: hotelId
            },
            data: { availableCount: 0 }
          });
          
          return updatedRoom;
        });

        // Get the updated room to return in the response
        const updatedRoom = await prisma.room.findUnique({
          where: { id: roomId }
        });

        return NextResponse.json({
          ...updatedRoom,
          cancelledBookings: { 
            count: activeHotelBookings.length, 
            message: `Cancelled all ${activeHotelBookings.length} bookings as room availability is set to 0` 
          }
        });
      }

      // If the new availability is less than the current bookings, cancel some bookings
      if (newAvailableCount < bookedCount) {
        // Improve the cancellation logic - order by created date to cancel most recent first
        const bookingsToCancel = bookedCount - newAvailableCount;
        
        // Select bookings to cancel (most recent ones)
        const bookingsToCancelList = activeHotelBookings.slice(0, bookingsToCancel);
        
        // Extract the authorization token from the incoming request
        const authHeader = request.headers.get('authorization');
        
        // Use the booking cancellation API for each booking instead of direct DB update
        const cancellationPromises = bookingsToCancelList.map(async (hotelBooking) => {
          try {
            // Call the booking cancellation endpoint for proper cancellation process
            const cancelResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/bookings/${hotelBooking.booking.id}`, {
              method: 'DELETE',
              headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json'
              }
            });
            
            if (!cancelResponse.ok) {
              const errorText = await cancelResponse.text();
              console.error(`Failed to cancel booking ${hotelBooking.booking.id}: ${errorText}`);
              return { id: hotelBooking.booking.id, success: false, error: errorText };
            }
            
            return { id: hotelBooking.booking.id, success: true };
          } catch (error) {
            console.error(`Error cancelling booking ${hotelBooking.booking.id}:`, error);
            return { id: hotelBooking.booking.id, success: false, error: error.message };
          }
        });
        
        // Wait for all cancellation requests to complete
        const cancellationResults = await Promise.all(cancellationPromises);
        
        // Log the results
        const successfulCancellations = cancellationResults.filter(r => r.success).length;
        console.log(`Successfully cancelled ${successfulCancellations} out of ${bookingsToCancel} bookings`);
      }

      // Update the room's available count
      const updatedRoom = await prisma.room.update({
        where: {
          id: roomId,
          hotelId: hotelId
        },
        data: { availableCount: newAvailableCount }
      });
      
      return NextResponse.json({
        ...updatedRoom,
        cancelledBookings: (newAvailableCount < bookedCount) ? 
          bookedCount - newAvailableCount : 0
      });
    }
  } catch (error) {
    console.error('Error updating room:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message }, 
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    // Await params before destructuring
    const resolvedParams = await params;
    const { id: hotelId } = resolvedParams;

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

    // Fix: Extract roomId from URL properly
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const roomId = pathParts[pathParts.length - 1];

    // Get hotel
    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId },
      include: { rooms: true }
    });

    if (!hotel) {
      return NextResponse.json(
        { error: 'Hotel not found' },
        { status: 404 }
      );
    }

    // Verify the room exists in this hotel
    const roomExists = hotel.rooms.some(room => room.id === roomId);
    if (!roomExists) {
      return NextResponse.json(
        { error: 'Room not found in this hotel' },
        { status: 404 }
      );
    }

    // Get request body
    const formData = await request.formData();
    const type = formData.get('type');
    const description = formData.get('description');
    const price = parseFloat(formData.get('price'));
    const currency = formData.get('currency') || 'USD';
    const amenities = formData.get('amenities');
    const availableCount = parseInt(formData.get('availableCount'));
    const maxGuestsRaw = formData.get('maxGuests');
    const maxGuests = maxGuestsRaw ? parseInt(maxGuestsRaw.toString()) : null;
    
    // Get image URLs from form data
    const images = formData.getAll('images');
    console.log('PUT - Images from form data:', images); // Debug log
    const imageUrls = images.filter(img => img && typeof img === 'string' && img.trim() !== '');
    console.log('PUT - Filtered image URLs:', imageUrls); // Debug log

    // Update room with images in a transaction
    const updatedRoom = await prisma.$transaction(async (tx) => {
      // First update the room data
      const room = await tx.room.update({
        where: {
          id: roomId,
          hotelId: hotelId // Ensure room belongs to this hotel
        },
        data: {
          type,
          description,
          price,
          currency,
          amenities,
          availableCount,
          maxGuests,
        },
      });

      // Only handle image updates if images are explicitly provided in the form
      if (formData.has('images')) {
        if (imageUrls.length > 0) {
          // First delete existing images
          await tx.roomImage.deleteMany({
            where: { roomId: roomId }
          });

          // Then create new image records
          await tx.roomImage.createMany({
            data: imageUrls.map(url => ({
              roomId: roomId,
              url: url
            }))
          });
        }
      }
      
      // Return the updated room with its images
      return tx.room.findUnique({
        where: { id: roomId },
        include: { images: true }
      });
    });

    return NextResponse.json(updatedRoom);

  } catch (error) {
    console.error('Error updating room:', error);
    return NextResponse.json(
      { error: 'Failed to update room', details: error.message },
      { status: 500 }
    );
  }
}
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticate, verifyToken } from '@/lib/auth';

export async function POST(request, { params }) {
  try {
    // Extract user from headers set by middleware
    const userId = request.headers.get('x-user-id');
    const userEmail = request.headers.get('x-user-email');
    const userRole = request.headers.get('x-user-role');
    
    // If we have headers from middleware, use them
    let user = null;
    if (userId && userEmail && userRole) {
      user = { id: userId, email: userEmail, role: userRole };
    } 
    // Fallback to manual token extraction
    else {
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        user = verifyToken(token); // Use the imported verifyToken
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { id: hotelId } = params;
    
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
    
    // Check if hotel belongs to user
    if (hotel.ownerId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const { type, description, price, currency, amenities, images, quantity } = body;
    
    // Validate required fields
    if (!type || !description || !price || !amenities) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Create room
    const room = await prisma.room.create({
      data: {
        hotelId,
        type,
        description,
        price,
        currency: currency || 'USD',
        amenities,
        availableCount: quantity || 1, // Set initial available count
        images: {
          create: images?.map(image => ({
            url: image.url,
            caption: image.caption
          })) || []
        }
      },
      include: {
        images: true
      }
    });
    
    return NextResponse.json(room, { status: 201 });
  } catch (error) {
    console.error('Create room error:', error);
    return NextResponse.json(
      { error: 'Failed to create room' },
      { status: 500 }
    );
  }
}

export async function GET(request, { params }) {
  try {
    const { id: hotelId } = params;
    const { searchParams } = new URL(request.url);
    
    // Get date range parameters
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const roomType = searchParams.get('roomType');
    
    // Validate required parameters
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required parameters: startDate and endDate' },
        { status: 400 }
      );
    }

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
    
    // Check if user is the hotel owner or admin
    if (hotel.ownerId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - You do not own this hotel' },
        { status: 403 }
      );
    }
    
    // Build the query to get rooms based on filters
    let whereClause = {
      hotelId
    };
    
    if (roomType) {
      whereClause.type = roomType;
    }
    
    // Get all rooms matching the criteria
    // FIXED: Use the correct relation name 'bookings' instead of 'hotelBookings'
    const rooms = await prisma.room.findMany({
      where: whereClause,
      include: {
        bookings: {
          where: {
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
              status: 'CONFIRMED'  // Only count confirmed bookings
            }
          },
          include: {
            booking: true
          }
        }
      }
    });
    
    // Calculate days in the range
    const daysInRange = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    
    // Process room availability data
    const roomAvailability = rooms.map(room => {
      // Create a map of bookings per day
      const bookingsByDay = {};
      const dateArray = getDatesInRange(start, end);
      
      // Initialize all dates with zero bookings
      dateArray.forEach(date => {
        bookingsByDay[date] = 0;
      });
      
      // Count bookings for each day
      // FIXED: Use the correct relation name 'bookings' instead of 'hotelBookings'
      room.bookings.forEach(booking => {
        const bookingStart = new Date(booking.checkInDate);
        const bookingEnd = new Date(booking.checkOutDate);
        
        // Count each day of this booking
        dateArray.forEach(date => {
          const currentDate = new Date(date);
          if (currentDate >= bookingStart && currentDate < bookingEnd) {
            bookingsByDay[date]++;
          }
        });
      });
      
      // Calculate statistics
      const totalBookedRoomDays = Object.values(bookingsByDay).reduce((sum, count) => sum + count, 0);
      const totalPossibleRoomDays = room.availableCount * daysInRange;
      const occupancyRate = totalPossibleRoomDays > 0 ? 
        (totalBookedRoomDays / totalPossibleRoomDays) * 100 : 0;
      
      // Return formatted data
      return {
        roomId: room.id,
        roomType: room.type,
        availableCount: room.availableCount,
        totalBookings: room.bookings.length, // FIXED: Use the correct relation name
        occupancyRate: parseFloat(occupancyRate.toFixed(2)),
        dailyAvailability: dateArray.map(date => ({
          date,
          booked: bookingsByDay[date],
          available: room.availableCount - bookingsByDay[date]
        }))
      };
    });
    
    // Group by room type if needed
    let response = roomAvailability;
    if (!roomType) {
      const groupedByType = {};
      roomAvailability.forEach(room => {
        if (!groupedByType[room.roomType]) {
          groupedByType[room.roomType] = {
            roomType: room.roomType,
            rooms: []
          };
        }
        groupedByType[room.roomType].rooms.push(room);
      });
      
      // Calculate aggregate stats for each room type
      response = Object.values(groupedByType).map(group => {
        const totalAvailableCount = group.rooms.reduce((sum, room) => sum + room.availableCount, 0);
        const totalBookings = group.rooms.reduce((sum, room) => sum + room.totalBookings, 0);
        const avgOccupancyRate = group.rooms.length > 0 ? 
          group.rooms.reduce((sum, room) => sum + room.occupancyRate, 0) / group.rooms.length : 0;
          
        // Merge daily availability for all rooms of this type
        const mergedDailyAvailability = {};
        
        if (group.rooms.length > 0 && group.rooms[0].dailyAvailability) {
          group.rooms[0].dailyAvailability.forEach(day => {
            mergedDailyAvailability[day.date] = {
              date: day.date,
              booked: 0,
              available: 0
            };
          });
          
          group.rooms.forEach(room => {
            room.dailyAvailability.forEach(day => {
              mergedDailyAvailability[day.date].booked += day.booked;
              mergedDailyAvailability[day.date].available += day.available;
            });
          });
        }
        
        return {
          roomType: group.roomType,
          totalRooms: group.rooms.length,
          totalAvailableCount,
          totalBookings,
          averageOccupancyRate: parseFloat(avgOccupancyRate.toFixed(2)),
          dailyAvailability: Object.values(mergedDailyAvailability)
        };
      });
    }
    
    return NextResponse.json({
      hotel: {
        id: hotel.id,
        name: hotel.name
      },
      dateRange: {
        startDate,
        endDate,
        totalDays: daysInRange
      },
      availability: response
    });
    
  } catch (error) {
    console.error('Get room availability error:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { error: 'Failed to get room availability', details: error.message },
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
    const { id: hotelId } = params;
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
        
        // Cancel the selected bookings
        if (bookingsToCancel.size > 0) {
          await prisma.booking.updateMany({
            where: {
              id: { in: Array.from(bookingsToCancel) }
            },
            data: { 
              status: 'CANCELLED'
            }
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

      // Calculate how many bookings need to be canceled
      const bookedCount = activeHotelBookings.length;

      // If the new availability is less than the current bookings, cancel some bookings
      if (newAvailableCount < bookedCount) {
        const bookingsToCancel = bookedCount - newAvailableCount;
        const bookingsToCancelList = activeHotelBookings.slice(0, bookingsToCancel);
        
        // Update the status of these bookings to CANCELLED
        await Promise.all(bookingsToCancelList.map(hotelBooking => 
          prisma.booking.update({
            where: { id: hotelBooking.booking.id },
            data: { 
              status: 'CANCELLED'
            }
          })
        ));
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
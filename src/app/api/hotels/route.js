import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticate, authorize, verifyToken } from '@/lib/auth';

export async function POST(request) {
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
        user = verifyToken(token); // Use the imported function
      }
    }
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    
    // Check if user is a hotel owner
    if (user.role !== 'HOTEL_OWNER' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const { name, logo, address, cityId, rating, images, amenities } = body;
    
    // Validate required fields
    if (!name || !address || !cityId || !rating) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Create hotel
    const hotel = await prisma.hotel.create({
      data: {
        name,
        logo,
        address,
        cityId,
        rating,
        ownerId: user.id,
        amenities: amenities || '',
        images: {
          create: images?.map(image => ({
            url: image.url,
            caption: image.caption
          })) || []
        }
      },
      include: {
        images: true,
        city: true
      }
    });
    
    return NextResponse.json(hotel, { status: 201 });
  } catch (error) {
    console.error('Create hotel error:', error);
    return NextResponse.json(
      { error: 'Failed to create hotel' },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const cityId = searchParams.get('cityId');
    const name = searchParams.get('name');
    const minRating = searchParams.get('minRating');
    const maxPrice = searchParams.get('maxPrice');
    const amenities = searchParams.get('amenities');
    const checkInDate = searchParams.get('checkInDate');
    const checkOutDate = searchParams.get('checkOutDate');
    
    // Build filter
    const filter = {};
    
    if (cityId) {
      filter.cityId = cityId;
    }
    
    if (name) {
      // Fix: Use contains without mode for case-insensitive search
      filter.name = {
        contains: name
      };
    }
    
    if (minRating) {
      filter.rating = {
        gte: parseFloat(minRating)
      };
    }
    
    if (amenities) {
      filter.amenities = {
        contains: amenities
      };
    }
    
    // Get hotels with their rooms
    const hotels = await prisma.hotel.findMany({
      where: filter,
      include: {
        images: true,
        city: true,
        rooms: {
          include: {
            images: true
          }
        }
      }
    });
    
    // If dates are provided, filter hotels with available rooms
    let filteredHotels = hotels;
    
    if (checkInDate && checkOutDate) {
      const start = new Date(checkInDate);
      const end = new Date(checkOutDate);
      
      // Validate date format
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return NextResponse.json(
          { error: 'Invalid date format. Use YYYY-MM-DD format' },
          { status: 400 }
        );
      }
      
      // Validate date range
      if (end <= start) {
        return NextResponse.json(
          { error: 'Check-out date must be after check-in date' },
          { status: 400 }
        );
      }
      
      // Get all dates in the range
      const datesInRange = getDatesInRange(start, end);
      
      // Filter hotels with available rooms for the entire date range
      filteredHotels = await Promise.all(hotels.map(async hotel => {
        // Check availability for each room in the hotel
        const availableRooms = await Promise.all(hotel.rooms.map(async room => {
          let isAvailable = true;
          
          // For each date, check if the room has availability
          for (const date of datesInRange) {
            const bookingsOnDate = await prisma.hotelBooking.count({
              where: {
                roomId: room.id,
                status: 'CONFIRMED',
                booking: {
                  status: { not: 'CANCELLED' }
                },
                checkInDate: { lte: new Date(date) },
                checkOutDate: { gt: new Date(date) }
              }
            });
            
            // If bookings equals or exceeds available count, room is not available
            if (bookingsOnDate >= room.availableCount) {
              isAvailable = false;
              break;
            }
          }
          
          return isAvailable ? room : null;
        }));
        
        // Filter out null rooms and return hotel with only available rooms
        const filteredRooms = availableRooms.filter(room => room !== null);
        
        if (filteredRooms.length > 0) {
          return {
            ...hotel,
            rooms: filteredRooms
          };
        }
        
        return null;
      }));
      
      // Remove hotels without available rooms
      filteredHotels = filteredHotels.filter(hotel => hotel !== null);
    }
    
    // Filter by max price if provided
    if (maxPrice) {
      const maxPriceValue = parseFloat(maxPrice);
      filteredHotels = filteredHotels.filter(hotel => {
        return hotel.rooms.some(room => room.price <= maxPriceValue);
      });
    }
    
    // Format hotels to include starting price and location
    const formattedHotels = filteredHotels.map(hotel => {
      // Calculate the starting price (lowest price among available rooms)
      const startingPrice = Math.min(
        ...hotel.rooms.map(room => room.price)
      );
      
      return {
        id: hotel.id,
        name: hotel.name,
        address: hotel.address,
        cityId: hotel.cityId,
        city: hotel.city,
        rating: hotel.rating,
        images: hotel.images,
        amenities: hotel.amenities,
        startingPrice,
        currency: hotel.rooms[0]?.currency || 'USD',
        location: {
          latitude: hotel.latitude,
          longitude: hotel.longitude
        },
        availableRoomCount: hotel.rooms.length
      };
    });
    
    return NextResponse.json(formattedHotels);
  } catch (error) {
    console.error('Get hotels error:', error);
    return NextResponse.json(
      { error: 'Failed to get hotels' },
      { status: 500 }
    );
  }
}

// Helper function to get all dates in a range
function getDatesInRange(startDate, endDate) {
  const dates = [];
  const currentDate = new Date(startDate);
  
  while (currentDate < endDate) {
    dates.push(currentDate.toISOString().split('T')[0]);
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return dates;
}
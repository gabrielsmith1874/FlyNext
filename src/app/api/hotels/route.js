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
    
    const body = await request.json();
    const { 
      name, 
      description,
      logo, 
      address, 
      cityId, 
      rating, 
      images, 
      amenities,
      contactEmail,
      contactPhone 
    } = body;
    
    // Validate required fields
    if (!name || !address || !cityId || !rating || !contactEmail || !contactPhone) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Create hotel
    const hotel = await prisma.hotel.create({
      data: {
        name,
        description,
        logo,
        address,
        cityId,
        rating,
        ownerId: user.id,
        amenities: amenities || '',
        contactEmail,
        contactPhone,
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
    
    // Automatically update the user's role to HOTEL_OWNER if not already
    if (user.role !== 'HOTEL_OWNER') {
      await prisma.user.update({
        where: { id: user.id },
        data: { role: 'HOTEL_OWNER' }
      });
    }
    
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
    
    // Get all search parameters with logging
    const city = searchParams.get('city');
    const cityId = searchParams.get('cityId');
    const ownerId = searchParams.get('ownerId');
    const name = searchParams.get('name');
    const minRatingStr = searchParams.get('minRating');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    
    console.log('Search parameters:', { 
      city, cityId, ownerId, name, minRatingStr, minPrice, maxPrice 
    });
    
    // Build the basic query structure
    const query = {
      where: {},
      include: {
        city: true,
        images: true,
        rooms: {
          select: {
            id: true,
            type: true,
            price: true,
            currency: true,
            availableCount: true,
            _count: {
              select: {
                bookings: true
              }
            }
          }
        }
      }
    };

    // Apply each filter individually with error handling
    try {
      // City ID filter
      if (cityId) {
        query.where.cityId = cityId;
      }
      
      // City name filter
      if (city) {
        query.where = {
          ...query.where,
          city: {
            name: {
              contains: city
            }
          }
        };
      }
      
      // Hotel name filter
      if (name) {
        query.where.name = {
          contains: name, // Removed mode: 'insensitive' as it is not supported in this Prisma version
        };
        console.log(`Filtering hotels with name containing "${name}"`);
      }
      
      // Minimum rating filter
      if (minRatingStr) {
        try {
          const minRating = parseFloat(minRatingStr);
          if (!isNaN(minRating)) {
            query.where.rating = {
              gte: minRating
            };
            console.log(`Filtering hotels with minimum rating: ${minRating}`);
          } else {
            console.warn(`Invalid minRating value: "${minRatingStr}", ignoring this filter`);
          }
        } catch (e) {
          console.warn(`Error parsing minRating "${minRatingStr}": ${e.message}, ignoring this filter`);
        }
      }
      
      // Owner filter
      if (ownerId) {
        query.where.ownerId = ownerId;
        // When querying owned hotels, include additional details
        query.include = {
          ...query.include,
          rooms: {
            select: {
              id: true,
              type: true,
              price: true,
              availableCount: true,
              _count: {
                select: {
                  bookings: {
                    where: {
                      status: 'CONFIRMED'
                    }
                  }
                }
              }
            }
          }
        };
      }
      
      // Price range filters - wrap in try-catch
      if (minPrice || maxPrice) {
        try {
          const priceFilter = {};
          
          if (minPrice) {
            const parsedMinPrice = parseFloat(minPrice);
            if (!isNaN(parsedMinPrice)) {
              priceFilter.gte = parsedMinPrice;
            } else {
              console.warn(`Invalid minPrice value: "${minPrice}", ignoring this part of filter`);
            }
          }
          
          if (maxPrice) {
            const parsedMaxPrice = parseFloat(maxPrice);
            if (!isNaN(parsedMaxPrice)) {
              priceFilter.lte = parsedMaxPrice;
            } else {
              console.warn(`Invalid maxPrice value: "${maxPrice}", ignoring this part of filter`);
            }
          }
          
          // Only add the filter if we have valid price conditions
          if (Object.keys(priceFilter).length > 0) {
            query.where.rooms = {
              some: {
                price: priceFilter
              }
            };
          }
        } catch (e) {
          console.warn(`Error parsing price filters: ${e.message}, ignoring price filters`);
        }
      }
    } catch (filterError) {
      console.error('Error applying filters:', filterError);
      // Continue with query execution without the problematic filters
    }

    console.log('Executing query:', JSON.stringify(query, null, 2));
    
    // Execute the query with error handling
    let hotels = [];
    try {
      hotels = await prisma.hotel.findMany(query);
      console.log(`Found ${hotels.length} hotels`);
    } catch (queryError) {
      console.error('Database query error:', queryError);
      return NextResponse.json(
        { error: 'Database query failed: ' + queryError.message },
        { status: 500 }
      );
    }

    // Format response data with error handling
    try {
      const formattedHotels = hotels.map(hotel => {
        try {
          // Find cheapest room safely
          let cheapestRoom = null;
          if (hotel.rooms && hotel.rooms.length > 0) {
            cheapestRoom = hotel.rooms.reduce((min, room) => 
              (!min || (room.price !== undefined && room.price < min.price)) ? room : min
            , null);
          }

          return {
            id: hotel.id,
            name: hotel.name || '',
            description: hotel.description || '',
            address: hotel.address || '',
            city: hotel.city?.name || '',
            country: hotel.city?.country || '',
            rating: hotel.rating || 0,
            amenities: hotel.amenities || '',
            images: hotel.images || [],
            pricePerNight: cheapestRoom?.price || 0,
            currency: cheapestRoom?.currency || 'USD',
            rooms: (hotel.rooms || []).map(room => {
              try {
                return {
                  id: room.id || '',
                  type: room.type || '',
                  description: room.description || '',
                  price: room.price || 0,
                  currency: room.currency || 'USD',
                  availableCount: room.availableCount || 0,
                  bookedCount: room._count?.bookings || 0
                };
              } catch (roomError) {
                console.error('Error formatting room data:', roomError);
                return {
                  id: room.id || '',
                  type: 'Error formatting room data',
                  price: 0,
                  currency: 'USD',
                  availableCount: 0,
                  bookedCount: 0
                };
              }
            })
          };
        } catch (hotelError) {
          console.error('Error formatting hotel data:', hotelError);
          // Return minimal hotel data to avoid breaking the response
          return {
            id: hotel.id || 'unknown',
            name: hotel.name || 'Error formatting hotel data',
            images: [],
            rooms: []
          };
        }
      });

      return NextResponse.json(formattedHotels);
    } catch (formatError) {
      console.error('Error formatting response data:', formatError);
      return NextResponse.json(
        { error: 'Error formatting response data: ' + formatError.message },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Search hotels error:', error);
    return NextResponse.json(
      { error: 'Failed to search hotels: ' + error.message },
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
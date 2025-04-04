import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const cityId = searchParams.get('cityId');
    const cityName = searchParams.get('cityName');
    const limit = parseInt(searchParams.get('limit') || '3', 10);
    
    if (!cityId && !cityName) {
      return NextResponse.json(
        { error: 'City ID or name is required' },
        { status: 400 }
      );
    }
    
    // Query conditions - remove the "mode: insensitive" argument
    const whereCondition = cityId 
  ? { cityId } 
  : { 
      city: { 
        name: { 
          contains: cityName.toLowerCase() 
        } 
      } 
    };
    
    // Get top rated hotels in the specified city
    const hotels = await prisma.hotel.findMany({
      where: whereCondition,
      include: {
        images: { take: 1 },
        city: true,
        rooms: {
          orderBy: { price: 'asc' },
          take: 1
        }
      },
      orderBy: { rating: 'desc' },
      take: limit
    });
    
    const formattedHotels = hotels.map(hotel => ({
      id: hotel.id,
      name: hotel.name,
      city: hotel.city.name,
      country: hotel.city.country,
      rating: hotel.rating,
      image: hotel.images[0]?.url || null,
      startingPrice: hotel.rooms[0]?.price || null,
      currency: hotel.rooms[0]?.currency || 'USD'
    }));
    
    return NextResponse.json(formattedHotels);
  } catch (error) {
    console.error('Hotel suggestions error:', error);
    return NextResponse.json(
      { error: 'Failed to get hotel suggestions' },
      { status: 500 }
    );
  }
}
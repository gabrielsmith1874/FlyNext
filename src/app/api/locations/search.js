import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    
    if (!query || query.length < 2) {
      return NextResponse.json([]);
    }
    
    // Search for cities
    const cities = await prisma.city.findMany({
      where: {
        name: {
          contains: query,
          mode: 'insensitive'
        }
      },
      take: limit,
      select: {
        id: true,
        name: true,
        country: true,
      }
    });
    
    // Search for airports
    const airports = await prisma.airport.findMany({
      where: {
        OR: [
          {
            name: {
              contains: query,
              mode: 'insensitive'
            }
          },
          {
            code: {
              contains: query.toUpperCase()
            }
          }
        ]
      },
      include: {
        city: true
      },
      take: limit
    });
    
    // Format results
    const formattedCities = cities.map(city => ({
      id: city.id,
      type: 'city',
      name: city.name,
      country: city.country,
      displayName: `${city.name}, ${city.country}`
    }));
    
    const formattedAirports = airports.map(airport => ({
      id: airport.id,
      type: 'airport',
      code: airport.code,
      name: airport.name,
      city: airport.city.name,
      country: airport.city.country,
      displayName: `${airport.name} (${airport.code}), ${airport.city.name}`
    }));
    
    // Merge and sort results
    const results = [...formattedCities, ...formattedAirports]
      .sort((a, b) => {
        // Prioritize exact matches, then starts with, then contains
        const aStartsWith = a.name.toLowerCase().startsWith(query.toLowerCase()) ? 1 : 0;
        const bStartsWith = b.name.toLowerCase().startsWith(query.toLowerCase()) ? 1 : 0;
        
        if (aStartsWith !== bStartsWith) {
          return bStartsWith - aStartsWith;
        }
        
        return a.name.localeCompare(b.name);
      })
      .slice(0, limit);
    
    return NextResponse.json(results);
  } catch (error) {
    console.error('Location search error:', error);
    return NextResponse.json(
      { error: 'Failed to search locations' },
      { status: 500 }
    );
  }
}
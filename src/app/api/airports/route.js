import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { getAirports } from '../../../../lib/afs-api';

export async function GET() {
  try {
    // Get airports from database
    let airports = await prisma.airport.findMany({
      include: {
        city: true
      }
    });
    
    // If no airports in database, fetch from AFS and store
    if (airports.length === 0) {
      const afsAirports = await getAirports();
      
      // First ensure all cities exist
      for (const airport of afsAirports) {
        // Find or create city
        let city = await prisma.city.findFirst({
          where: {
            name: airport.city,
            country: airport.country
          }
        });
        
        if (!city) {
          city = await prisma.city.create({
            data: {
              name: airport.city,
              country: airport.country
            }
          });
        }
        
        // Create airport
        await prisma.airport.create({
          data: {
            id: airport.id,
            code: airport.code,
            name: airport.name,
            cityId: city.id
          }
        });
      }
      
      // Get airports from database again
      airports = await prisma.airport.findMany({
        include: {
          city: true
        }
      });
    }
    
    return NextResponse.json(airports);
  } catch (error) {
    console.error('Get airports error:', error);
    return NextResponse.json(
      { error: 'Failed to get airports' },
      { status: 500 }
    );
  }
}
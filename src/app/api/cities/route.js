import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCities } from '@/lib/afs-api';

export async function GET() {
  try {
    // Get cities from database
    let cities = await prisma.city.findMany();
    
    // If no cities in database, fetch from AFS and store
    if (cities.length === 0) {
      const afsCities = await getCities();
      
      // Create cities in database
      const cityData = afsCities.map(city => ({
        name: city.city,
        country: city.country
      }));
      
      await prisma.city.createMany({
        data: cityData
      });
      
      // Get cities from database again
      cities = await prisma.city.findMany();
    }
    
    return NextResponse.json(cities);
  } catch (error) {
    console.error('Get cities error:', error);
    return NextResponse.json(
      { error: 'Failed to get cities' },
      { status: 500 }
    );
  }
}
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAirlines } from '@/lib/afs-api';

export async function GET() {
  try {
    // Get airlines from database
    let airlines = await prisma.airline.findMany();
    
    // If no airlines in database, fetch from AFS and store
    if (airlines.length === 0) {
      const afsAirlines = await getAirlines();
      
      // Create airlines in database
      const airlineData = afsAirlines.map(airline => ({
        code: airline.code,
        name: airline.name,
        baseCode: airline.base?.code
      }));
      
      await prisma.airline.createMany({
        data: airlineData
      });
      
      // Get airlines from database again
      airlines = await prisma.airline.findMany();
    }
    
    return NextResponse.json(airlines);
  } catch (error) {
    console.error('Get airlines error:', error);
    return NextResponse.json(
      { error: 'Failed to get airlines' },
      { status: 500 }
    );
  }
}
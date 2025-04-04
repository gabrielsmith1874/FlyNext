import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAirports } from '@/lib/afs-api';

export async function GET(): Promise<NextResponse> {
  try {
    let airports = await prisma.airport.findMany({
      include: {
        city: true,
      },
    });

    if (airports.length === 0) {
      const afsAirports = await getAirports();

      for (const airport of afsAirports) {
        let city = await prisma.city.findFirst({
          where: {
            name: airport.city,
            country: airport.country,
          },
        });

        if (!city) {
          city = await prisma.city.create({
            data: {
              name: airport.city,
              country: airport.country,
            },
          });
        }

        await prisma.airport.create({
          data: {
            id: airport.id,
            code: airport.code,
            name: airport.name,
            cityId: city.id,
          },
        });
      }

      airports = await prisma.airport.findMany({
        include: {
          city: true,
        },
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
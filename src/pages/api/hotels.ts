import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const city = req.query.city?.toString().toLowerCase();
    const hotels = await prisma.hotel.findMany({
      where: {
        city: {
          equals: city,
          mode: 'insensitive', // Ensure case-insensitive matching
        },
        // Add other filters as needed
      },
    });

    res.status(200).json(hotels);
  } catch (error) {
    console.error('Error fetching hotels:', error);
    res.status(500).json({ error: 'Failed to fetch hotels' });
  }
}
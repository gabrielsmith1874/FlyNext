import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function GET(request, { params }) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;
    const hotel = await prisma.hotel.findUnique({
      where: { id },
      include: {
        city: true,
        images: true,
        rooms: {
          include: {
            images: true
          }
        }
      }
    });

    if (!hotel) {
      return NextResponse.json(
        { error: 'Hotel not found' },
        { status: 404 }
      );
    }

    // Format the response
    const formattedHotel = {
      id: hotel.id,
      name: hotel.name,
      description: hotel.description || '',
      address: hotel.address,
      cityId: hotel.cityId,
      city: hotel.city?.name || '',
      country: hotel.city?.country || '',
      rating: hotel.rating,
      amenities: hotel.amenities || '',
      contactEmail: hotel.contactEmail,    // Add this
      contactPhone: hotel.contactPhone,    // Add this
      images: hotel.images || [],
      rooms: hotel.rooms?.map(room => ({
        id: room.id,
        type: room.type,
        description: room.description,
        price: room.price,
        currency: room.currency,
        amenities: room.amenities,
        availableCount: room.availableCount,
        maxGuests: room.maxGuests, // Ensure maxGuests is included
        images: room.images
      })) || []
    };

    return NextResponse.json(formattedHotel);
  } catch (error) {
    console.error('Get hotel error:', error);
    return NextResponse.json(
      { error: 'Failed to get hotel' },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { images } = body;

    // Update room details
    const updatedRoom = await prisma.room.update({
      where: { id },
      data: {
        ...body, // Include other fields like name, description, etc.
      },
    });

    // Handle images
    if (images && images.length > 0) {
      // Delete existing images
      await prisma.roomImage.deleteMany({
        where: { roomId: id },
      });

      // Add new images
      await prisma.roomImage.createMany({
        data: images.map((image) => ({
          roomId: id,
          url: image.url,
          caption: image.caption || null,
        })),
      });
    }

    return NextResponse.json(updatedRoom);
  } catch (error) {
    console.error('Error updating room:', error);
    return NextResponse.json({ error: 'Failed to update room' }, { status: 500 });
  }
}
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import formidable from 'formidable';
import fs from 'fs/promises';
import { Readable } from 'stream';
import path from 'path';

export const config = {
  api: {
    bodyParser: false, // Disable Next.js body parser to handle FormData
  },
};

// Helper function to convert NextRequest to a Node.js readable stream
async function convertNextRequestToNodeRequest(nextRequest) {
  const body = await nextRequest.arrayBuffer();
  const readable = new Readable();
  readable._read = () => {};
  readable.push(Buffer.from(body));
  readable.push(null);

  // Create a mock Node.js request object with headers
  const nodeRequest = Object.assign(readable, {
    headers: {
      'content-type': nextRequest.headers.get('content-type'),
      'content-length': body.byteLength.toString(), // Add content-length header
    },
    method: nextRequest.method,
    url: nextRequest.url,
  });

  return nodeRequest;
}

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

export async function PUT(request, context) {
  const { id } = await context.params;

  try {
    // Verify authentication
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

    // Get the hotel to verify ownership
    const hotel = await prisma.hotel.findUnique({
      where: { id },
      include: { images: true }
    });

    if (!hotel) {
      return NextResponse.json(
        { error: 'Hotel not found' },
        { status: 404 }
      );
    }

    // Check if user is hotel owner or admin
    if (hotel.ownerId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - You do not own this hotel' },
        { status: 403 }
      );
    }

    // Parse the form data using formidable
    const form = formidable({ multiples: true, uploadDir: path.join(process.cwd(), 'public', 'uploads', 'hotels'), keepExtensions: true });
    const nodeRequest = await convertNextRequestToNodeRequest(request);

    const { fields, files } = await new Promise<{ fields: formidable.Fields; files: formidable.Files }>((resolve, reject) => {
      form.parse(nodeRequest, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    // Extract basic hotel data from fields
    const name = fields.name;
    const description = fields.description;
    const address = fields.address;
    const cityId = fields.cityId;
    const rating = parseFloat(fields.rating);
    const amenities = fields.amenities;
    const contactEmail = fields.contactEmail;
    const contactPhone = fields.contactPhone;

    // Get removed image IDs
    const removedImageIdsStr = fields.removedImageIds;
    const removedImageIds = removedImageIdsStr ? JSON.parse(removedImageIdsStr) : [];

    // Handle new images
    const imageUrls: string[] = [];
    if (files.newImages) {
      const newImages = Array.isArray(files.newImages) ? files.newImages : [files.newImages];
      for (const img of newImages) {
        const fileName = path.basename(img.filepath);
        imageUrls.push(`/uploads/hotels/${fileName}`);
      }
    }

    // Update hotel with transaction to handle images
    const updatedHotel = await prisma.$transaction(async (tx) => {
      // 1. Delete removed images
      if (removedImageIds.length > 0) {
        await tx.hotelImage.deleteMany({
          where: {
            id: { in: removedImageIds }
          }
        });
      }

      // 2. Add new images
      if (imageUrls.length > 0) {
        await tx.hotelImage.createMany({
          data: imageUrls.map(url => ({
            hotelId: id,
            url: url
          }))
        });
      }

      // 3. Update hotel data
      return tx.hotel.update({
        where: { id },
        data: {
          name,
          description,
          address,
          cityId,
          rating,
          amenities,
          contactEmail,
          contactPhone
        },
        include: {
          images: true,
          city: true
        }
      });
    });

    return NextResponse.json(updatedHotel);
  } catch (error) {
    console.error('Error updating hotel:', error);
    return NextResponse.json({ error: 'Failed to update hotel', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
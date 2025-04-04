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
  return readable;
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

    // Convert and parse the form data
    const formData = await request.formData();
    
    // Extract basic hotel data from form
    const name = formData.get('name');
    const description = formData.get('description');
    const address = formData.get('address');
    const cityId = formData.get('cityId');
    const rating = parseFloat(formData.get('rating'));
    const amenities = formData.get('amenities');
    const contactEmail = formData.get('contactEmail');
    const contactPhone = formData.get('contactPhone');
    
    // Get removed image IDs
    const removedImageIdsStr = formData.get('removedImageIds');
    const removedImageIds = removedImageIdsStr ? JSON.parse(removedImageIdsStr) : [];
    
    // Handle new images
    const images = formData.getAll('newImages'); // Updated to match the frontend field name
    const imageUrls = [];
    
    // Process uploaded images
    for (const img of images) {
      if (img instanceof File && img.size > 0) {
        try {
          // Ensure upload directory exists
          const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'hotels');
          await fs.mkdir(uploadsDir, { recursive: true });
          
          // Generate unique filename
          const fileName = `hotel-${id}-${Date.now()}-${img.name}`;
          const filePath = path.join(uploadsDir, fileName);
          
          // Convert File object to buffer and save
          const arrayBuffer = await img.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          await fs.writeFile(filePath, buffer);
          
          // Add to image URLs
          imageUrls.push(`/uploads/hotels/${fileName}`);
        } catch (error) {
          console.error(`Error saving file ${img.name}:`, error);
        }
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
    return NextResponse.json({ error: 'Failed to update hotel', details: error.message }, { status: 500 });
  }
}
import { NextResponse } from 'next/server';
import { join } from 'path';
import { writeFile, mkdir } from 'fs/promises';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function POST(request, context) {
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

    const resolvedParams = await context.params;
    const { id } = resolvedParams;

    // Parse the form data
    const formData = await request.formData();
    
    // Get hotel data
    const name = formData.get('name');
    const description = formData.get('description');
    const address = formData.get('address');
    const cityId = formData.get('cityId');
    const rating = parseFloat(formData.get('rating'));
    const amenities = formData.get('amenities');
    const contactEmail = formData.get('contactEmail');
    const contactPhone = formData.get('contactPhone');
    
    // Get the image file
    const image = formData.get('image');
    let imagePath = null;
    
    if (image && image.size > 0) {
      const bytes = await image.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      // Create directory if it doesn't exist
      const uploadDir = join(process.cwd(), 'public/uploads');
      await mkdir(uploadDir, { recursive: true });
      
      // Generate unique filename
      const filename = `hotel-${id}-${Date.now()}.${image.name.split('.').pop()}`;
      const filePath = join(uploadDir, filename);
      
      // Write the file
      await writeFile(filePath, buffer);
      
      // Set the image path to be stored in the database
      imagePath = `/uploads/${filename}`;
    }
    
    // Update hotel in database
    const hotelData = {
      name,
      description,
      address,
      city: {
        connect: {
          id: cityId
        }
      },
      rating,
      amenities,
      contactEmail,
      contactPhone,
    };
    
    // Only add image path if an image was uploaded
    if (imagePath) {
      // Use the logo field for the main hotel image
      hotelData.logo = imagePath;
      
      // Also update the images collection
      // First, delete any existing images for this hotel
      await prisma.hotelImage.deleteMany({
        where: {
          hotel: {
            id: id
          }
        }
      });
      
      // Then create a new image
      await prisma.hotelImage.create({
        data: {
          url: imagePath,
          caption: `${name} - Main Image`,
          hotel: {
            connect: {
              id: id
            }
          }
        }
      });
    }
    
    const updatedHotel = await prisma.hotel.update({
      where: { id },
      data: hotelData,
      include: {
        images: true, // Include images in the response
        city: true
      }
    });
    
    return NextResponse.json(updatedHotel);
  } catch (error) {
    console.error('Error updating hotel image:', error);
    return NextResponse.json(
      { error: 'Failed to update hotel image' },
      { status: 500 }
    );
  }
}

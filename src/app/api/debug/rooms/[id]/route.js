import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// This is a debugging endpoint to check room data with images
export async function GET(request, { params }) {
  try {
    const { id } = params;
    
    // Get room with images
    const room = await prisma.room.findUnique({
      where: { id },
      include: { 
        images: true,
        hotel: {
          select: {
            name: true,
            id: true
          }
        }
      }
    });
    
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }
    
    // Get all roomImages for this room directly from the roomImage table
    const roomImages = await prisma.roomImage.findMany({
      where: { roomId: id }
    });
    
    return NextResponse.json({
      room,
      roomImagesCount: roomImages.length,
      roomImagesDirectQuery: roomImages
    });
  } catch (error) {
    console.error('Debug room error:', error);
    return NextResponse.json(
      { error: 'Failed to get room debug info', details: error.message },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import prisma from '../../../../../lib/prisma'; // updated relative import
import { verifyToken, comparePassword, hashPassword } from '../../../../../lib/auth';

export async function GET(request) {
  try {
    // Extract user from headers set by middleware
    const userId = request.headers.get('x-user-id');
    const userEmail = request.headers.get('x-user-email');
    const userRole = request.headers.get('x-user-role');
    
    // If we have headers from middleware, use them
    let user = null;
    if (userId && userEmail && userRole) {
      user = { id: userId, email: userEmail, role: userRole };
    } 
    // Fallback to manual token extraction
    else {
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        user = verifyToken(token);
      }
    }
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get user data from database
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        profilePicture: true,
        passportId: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    if (!userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(userData);
  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    // Extract user from headers set by middleware
    const userId = request.headers.get('x-user-id');
    const userEmail = request.headers.get('x-user-email');
    const userRole = request.headers.get('x-user-role');
    
    // If we have headers from middleware, use them
    let user = null;
    if (userId && userEmail && userRole) {
      user = { id: userId, email: userEmail, role: userRole };
    } 
    // Fallback to manual token extraction
    else {
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        user = verifyToken(token);
      }
    }
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user is a hotel owner or admin
    if (user.role !== 'HOTEL_OWNER' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }
    
    // Get user data from database
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        profilePicture: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    if (!userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(userData);
  } catch (error) {
    console.error('Profile error:', error);
    return NextResponse.json(
      { error: 'Failed to get profile' },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    // Extract user from headers set by middleware
    const userId = request.headers.get('x-user-id');
    const userEmail = request.headers.get('x-user-email');
    const userRole = request.headers.get('x-user-role');
    
    // If we have headers from middleware, use them
    let user = null;
    if (userId && userEmail && userRole) {
      user = { id: userId, email: userEmail, role: userRole };
    } 
    // Fallback to manual token extraction
    else {
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        user = verifyToken(token);
      }
    }
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { 
      firstName, 
      lastName, 
      phone, 
      profilePicture, 
      passportId,
      email,
      currentPassword,
      newPassword
    } = body;

    // Validate email format if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate phone format if provided
    if (phone && !/^\+?[\d\s-]{10,}$/.test(phone)) {
      return NextResponse.json(
        { error: 'Invalid phone format' },
        { status: 400 }
      );
    }

    // Validate passportId format if provided
    if (passportId && passportId.length !== 9) {
      return NextResponse.json(
        { error: 'Passport ID must be 9 characters' },
        { status: 400 }
      );
    }

    // Check if email is already taken by another user
    if (email && email !== user.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });
      
      if (existingUser && existingUser.id !== user.id) {
        return NextResponse.json(
          { error: 'Email already in use' },
          { status: 409 }
        );
      }
    }

    // Build update object with only provided fields
    const updateData = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (phone !== undefined) updateData.phone = phone;
    if (profilePicture !== undefined) updateData.profilePicture = profilePicture;
    if (passportId !== undefined) updateData.passportId = passportId;
    if (email !== undefined) updateData.email = email;

    // If password update is requested, verify current password and update with hashed new password
    if (currentPassword && newPassword) {
      const userRecord = await prisma.user.findUnique({
        where: { id: user.id },
        select: { password: true }
      });
      
      if (!userRecord) {
        return NextResponse.json(
          { error: 'User not found for password verification' },
          { status: 404 }
        );
      }
      
      const isPasswordValid = await comparePassword(currentPassword, userRecord.password);
      if (!isPasswordValid) {
        return NextResponse.json(
          { error: 'Current password is incorrect' },
          { status: 400 }
        );
      }
      updateData.password = await hashPassword(newPassword);
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        profilePicture: true,
        passportId: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
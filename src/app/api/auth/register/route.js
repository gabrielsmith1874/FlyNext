import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword, generateToken } from '@/lib/auth';

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password, firstName, lastName, phone, role } = body;
    // Handle both passportID and passportId variations
    const passportId = body.passportId || body.passportID;
    
    // Validate required fields
    if (!email || !password || !firstName || !lastName || !passportId) {
      return NextResponse.json(
        { error: 'Missing required fields (email, password, firstName, lastName, passportID)' },
        { status: 400 }
      );
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 409 }
      );
    }
    
    // Hash password
    const hashedPassword = await hashPassword(password);
    
    // Create user with consistent passportId field
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        role: role || 'USER',
        passportId
      }
    });
    
    // Generate token
    const token = generateToken(user);
    
    // Return user data (excluding password)
    const { password: _, ...userData } = user;
    
    return NextResponse.json({
      user: userData,
      token
    }, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
}
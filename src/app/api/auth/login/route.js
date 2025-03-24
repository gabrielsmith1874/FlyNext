import { NextResponse } from 'next/server';
import prisma from '../../../../../lib/prisma';
import { comparePassword, generateToken } from '../../../../../lib/auth';

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password, passportId } = body;
    
    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    // Check if user exists
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    // Verify password
    const isPasswordValid = await comparePassword(password, user.password);
    
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify passportId is 9 characters
    if (passportId && passportId.length !== 9) {
      return NextResponse.json(
        { error: 'Passport ID must be 9 characters' },
        { status: 400 }
      );
    }
    
    // Update user's passportId if provided
    let updatedUser = user;
    if (passportId) {
      updatedUser = await prisma.user.update({
        where: { email },
        data: { passportId }
      });
    }
    
    // Generate token
    const token = generateToken(updatedUser);
    
    // Return user data (excluding password)
    const { password: _, ...userData } = updatedUser;
    
    return NextResponse.json({
      user: userData,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}
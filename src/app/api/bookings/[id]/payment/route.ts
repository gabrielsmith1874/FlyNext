import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function POST(request, { params }) {
  try {
    // Get and verify token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const user = await verifyToken(token);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }
    
    const { id } = params;
    const body = await request.json();
    const { cardNumber, cardholderName, expiryMonth, expiryYear, cvc } = body;
    
    // Validate input
    if (!cardNumber || !cardholderName || !expiryMonth || !expiryYear || !cvc) {
      return NextResponse.json(
        { error: 'All payment details are required' },
        { status: 400 }
      );
    }
    
    // Get booking
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        payment: true
      }
    });
    
    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }
    
    // Check if booking belongs to user
    if (booking.userId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }
    
    // Check if payment already exists
    if (booking.payment) {
      return NextResponse.json(
        { error: 'Payment already processed for this booking' },
        { status: 400 }
      );
    }
    
    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        amount: booking.totalAmount,
        status: 'COMPLETED',
        method: 'CREDIT_CARD',
        cardLast4: cardNumber.slice(-4),
        cardType: detectCardType(cardNumber),
        bookingId: id
      }
    });
    
    // Update booking status
    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: { status: 'CONFIRMED' }
    });
    
    // Create notification
    await prisma.notification.create({
      data: {
        userId: user.id,
        message: `Your booking (${booking.bookingReference}) has been confirmed. Payment of $${booking.totalAmount.toFixed(2)} was successful.`,
        type: 'BOOKING_CONFIRMATION'
      }
    });
    
    return NextResponse.json({
      success: true,
      booking: updatedBooking,
      payment
    });
    
  } catch (error) {
    console.error('Process payment error:', error);
    return NextResponse.json(
      { error: 'Failed to process payment' },
      { status: 500 }
    );
  }
}

// Function to detect card type based on the first few digits
function detectCardType(cardNumber) {
  const cleanNumber = cardNumber.replace(/\D/g, '');
  const firstDigit = cleanNumber.charAt(0);
  const firstTwo = cleanNumber.substring(0, 2);
  const firstThree = cleanNumber.substring(0, 3);
  const firstFour = cleanNumber.substring(0, 4);
  const firstSix = cleanNumber.substring(0, 6);
  
  // Visa
  if (firstDigit === '4') {
    return 'VISA';
  }
  
  // Mastercard
  if (['51', '52', '53', '54', '55'].includes(firstTwo) || 
      (parseInt(firstSix) >= 222100 && parseInt(firstSix) <= 272099)) {
    return 'MASTERCARD';
  }
  
  // Amex
  if (['34', '37'].includes(firstTwo)) {
    return 'AMEX';
  }
  
  // Discover
  if (firstFour === '6011' || 
      (parseInt(firstThree) >= 644 && parseInt(firstThree) <= 649) || 
      firstTwo === '65') {
    return 'DISCOVER';
  }
  
  return 'UNKNOWN';
}

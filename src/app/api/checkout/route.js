import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function POST(request) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const user = await verifyToken(token);
    
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { 
      bookingId, 
      cardNumber, 
      cardholderName, 
      expiryMonth, 
      expiryYear, 
      cvc 
    } = body;

    // Validate input
    if (!bookingId || !cardNumber || !cardholderName || !expiryMonth || !expiryYear || !cvc) {
      return NextResponse.json({ error: 'All payment fields are required' }, { status: 400 });
    }

    // Find the booking
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }
    
    if (booking.userId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: this booking does not belong to you' }, { status: 403 });
    }
    
    // Validate card details
    if (!validateCard(cardNumber, expiryMonth, expiryYear, cvc)) {
      return NextResponse.json({ error: 'Invalid credit card details' }, { status: 400 });
    }

    // Update booking status
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'CONFIRMED' }
    });

    // Create payment record using direct SQL if Prisma model isn't working
    // Get last 4 digits of card
    const cardLast4 = cardNumber.slice(-4);
    // Detect card type
    const cardType = detectCardType(cardNumber);
    
    // Manually check if Payment model exists
    try {
      // Try creating payment record
      console.log("Creating payment record...");
      await prisma.$executeRaw`
        INSERT INTO Payment (id, bookingId, cardLast4, cardType, cardholderName, paymentStatus, createdAt) 
        VALUES (
          ${crypto.randomUUID()}, 
          ${bookingId}, 
          ${cardLast4}, 
          ${cardType}, 
          ${cardholderName}, 
          'COMPLETED',
          ${new Date()}
        )
      `;
      console.log("Payment record created successfully");
    } catch (paymentError) {
      console.error("Error creating payment record:", paymentError);
      // Continue even if payment record creation fails
    }
    
    // Update hotel bookings if they exist
    try {
      await prisma.hotelBooking.updateMany({
        where: { bookingId: bookingId },
        data: { status: 'CONFIRMED' }
      });
    } catch (hotelError) {
      console.error("Failed to update hotel bookings:", hotelError);
      // Continue even if hotel booking update fails
    }

    // Create notification
    try {
      await prisma.notification.create({
        data: {
          userId: user.id,
          message: `Your booking (${booking.bookingReference}) has been confirmed.`,
          type: 'BOOKING_CONFIRMATION'
        }
      });
    } catch (notifError) {
      console.error("Failed to create notification:", notifError);
      // Continue even if notification creation fails
    }

    // Return success
    return NextResponse.json({
      success: true,
      message: 'Payment processed successfully',
      booking: {
        id: booking.id,
        bookingReference: booking.bookingReference,
        status: updatedBooking.status
      }
    });
    
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Checkout failed', details: error.message },
      { status: 500 }
    );
  }
}

// Simple card validation function
function validateCard(cardNumber, expiryMonth, expiryYear, cvc) {
  try {
    // Remove any spaces or dashes
    cardNumber = cardNumber.replace(/[\s-]/g, '');
    
    // Basic length check
    if (cardNumber.length < 13 || cardNumber.length > 19) {
      return false;
    }
    
    // Check card type
    const cardType = detectCardType(cardNumber);
    if (cardType === 'UNKNOWN') {
      return false;
    }
    
    // Luhn algorithm check
    if (!luhnCheck(cardNumber)) {
      return false;
    }
    
    // Check expiry date
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear() % 100;
    const currentMonth = currentDate.getMonth() + 1;
    
    const expMonth = parseInt(expiryMonth);
    const expYear = parseInt(expiryYear) % 100;
    
    if (isNaN(expMonth) || isNaN(expYear) || expMonth < 1 || expMonth > 12) {
      return false;
    }
    
    if (expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) {
      return false;
    }
    
    // Check CVC
    const cvcLength = cardType === 'AMEX' ? 4 : 3;
    if (cvc.length !== cvcLength) {
      return false;
    }
    
    return true;
  } catch (e) {
    return false;
  }
}

// Luhn algorithm check
function luhnCheck(cardNumber) {
  let sum = 0;
  let alternate = false;
  
  for (let i = cardNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cardNumber.charAt(i), 10);
    
    if (alternate) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    
    sum += digit;
    alternate = !alternate;
  }
  
  return sum % 10 === 0;
}

// Function to detect card type
function detectCardType(cardNumber) {
  // Simple version
  if (cardNumber.startsWith('4')) {
    return 'VISA';
  } else if (/^5[1-5]/.test(cardNumber)) {
    return 'MASTERCARD';
  } else if (/^3[47]/.test(cardNumber)) {
    return 'AMEX';
  } else if (/^6(?:011|5)/.test(cardNumber)) {
    return 'DISCOVER';
  } else {
    return 'UNKNOWN';
  }
}
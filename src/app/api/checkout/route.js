import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { generateInvoice } from '@/lib/pdf-gen';
import { sendInvoiceEmail } from '@/lib/email';

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
    const requestData = await request.json();
    const { 
      bookingId, 
      cardNumber, 
      cardholderName, 
      expiryMonth, 
      expiryYear, 
      cvc,
      firstName,
      lastName,
      email,
      phone,
      address,
      city,
      country,
      postalCode,
      passportNumber,
      specialRequests,
      passengers,
      hotelGuests
    } = requestData;

    // Validate input
    if (!bookingId || !cardNumber || !cardholderName || !expiryMonth || !expiryYear || !cvc) {
      console.error('Missing required fields:', { 
        hasBookingId: !!bookingId,
        hasCardNumber: !!cardNumber,
        hasCardholderName: !!cardholderName,
        hasExpiryMonth: !!expiryMonth,
        hasExpiryYear: !!expiryYear,
        hasCvc: !!cvc
      });
      return NextResponse.json({ error: 'All payment fields are required' }, { status: 400 });
    }

    // Find the booking
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: true,
        flights: true,
        hotelBookings: {
          include: {
            hotel: true,
            room: true
          }
        }
      }
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Verify booking belongs to user
    if (booking.userId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'You are not authorized to complete this booking' }, { status: 403 });
    }

    // Validate card details
    if (!validateCard(cardNumber, expiryMonth, expiryYear, cvc)) {
      return NextResponse.json({ error: 'Invalid credit card details' }, { status: 400 });
    }

    // Process payment and update booking status
    try {
      // Check if a payment already exists for this booking
      const existingPayment = await prisma.payment.findFirst({
        where: { bookingId: booking.id }
      });
      
      let payment;
      
      if (existingPayment) {
        // Update the existing payment instead of creating a new one
        payment = await prisma.payment.update({
          where: { id: existingPayment.id },
          data: {
            cardLast4: cardNumber.slice(-4),
            cardType: getCardType(cardNumber),
            cardholderName: cardholderName,
            paymentStatus: 'COMPLETED'
          }
        });
        console.log('Updated existing payment record:', payment.id);
      } else {
        // Create a new payment record
        payment = await prisma.payment.create({
          data: {
            bookingId: booking.id,
            cardLast4: cardNumber.slice(-4),
            cardType: getCardType(cardNumber),
            cardholderName: cardholderName,
            paymentStatus: 'COMPLETED'
          }
        });
        console.log('Created new payment record:', payment.id);
      }
      
      // Update booking status to CONFIRMED
      const updatedBooking = await prisma.booking.update({
        where: { id: booking.id },
        data: { 
          status: 'CONFIRMED',
          bookingReference: booking.bookingReference || generateBookingReference()
        },
        include: {
          user: true,
          flights: true,
          hotelBookings: {
            include: {
              hotel: true,
              room: true
            }
          },
          payment: true
        }
      });

      // Update hotel bookings with guest information if present
      if (booking.hotelBookings && booking.hotelBookings.length > 0) {
        try {
          console.log('Updating hotel bookings with guest information');
          
          await Promise.all(booking.hotelBookings.map((hotelBooking, index) => {
            console.log(`Updating hotel booking ID: ${hotelBooking.id} with guest details`);
            
            // Get hotel guest details for this specific booking based on index
            const guest = hotelGuests && hotelGuests.length > 0 ? hotelGuests[0] : {};
            
            // Prioritize data from the hotelGuests array
            const guestFirstName = guest.firstName || firstName || user.firstName || '';
            const guestLastName = guest.lastName || lastName || user.lastName || '';
            const guestEmail = guest.email || email || user.email || '';
            const guestPhone = guest.phone || phone || user.phone || '';
            
            console.log(`Guest name: ${guestFirstName} ${guestLastName}`);
            
            const guestDetails = {
              firstName: guestFirstName,
              lastName: guestLastName,
              email: guestEmail,
              phone: guestPhone,
              address: guest.address || address || user.address || '',
              city: guest.city || city || user.city || '',
              country: guest.country || country || user.country || '',
              postalCode: guest.postalCode || postalCode || user.postalCode || '',
              specialRequests: guest.specialRequests || specialRequests || ''
            };
            
            console.log('Guest details to be saved:', JSON.stringify(guestDetails));
            
            return prisma.hotelBooking.update({
              where: { id: hotelBooking.id },
              data: { 
                status: 'CONFIRMED',
                // Store guest details as a stringified JSON object
                guestDetails: JSON.stringify(guestDetails)
              }
            });
          }));
          
          console.log('Hotel bookings updated successfully with guest information');
        } catch (hotelUpdateError) {
          console.error('Failed to update hotel bookings status:', hotelUpdateError);
          // Continue with checkout even if updates fail
        }
      }
      
      // Update flights with passenger information if present
      if (booking.flights && booking.flights.length > 0) {
        try {
          console.log('Updating flight bookings with passenger information');
          
          await Promise.all(booking.flights.map((flight, index) => {
            console.log(`Updating flight booking ID: ${flight.id} with passenger details`);
            
            // Get passenger details for this specific flight based on index
            const passenger = passengers && passengers.length > 0 ? passengers[0] : {};
            
            // Prioritize data from the passengers array
            const passengerFirstName = passenger.firstName || firstName || user.firstName || 'Guest';
            const passengerLastName = passenger.lastName || lastName || user.lastName || 'Traveler';
            
            console.log(`Passenger name: ${passengerFirstName} ${passengerLastName}`);
            
            // Create passenger details object with fallbacks to ensure non-empty values
            const passengerDetails = {
              firstName: passengerFirstName,
              lastName: passengerLastName,
              email: email || user.email || '',
              phone: phone || user.phone || '',
              passportNumber: passportNumber || user.passportId || '', 
              dateOfBirth: user.dateOfBirth || '',
              nationality: user.nationality || '',
              specialRequests: specialRequests || ''
            };
            
            console.log('Passenger details to be saved:', JSON.stringify(passengerDetails));
            
            // Extract existing passenger details if they exist
            let existingStatus = flight.status || 'CONFIRMED';
            let updatedStatus;
            
            if (flight.status && flight.status.includes(':PASSENGER_DATA:')) {
              // Status already has passenger data, replace it
              const baseStatus = flight.status.split(':PASSENGER_DATA:')[0];
              updatedStatus = `${baseStatus}:PASSENGER_DATA:${JSON.stringify(passengerDetails)}`;
              console.log('Updating existing passenger data');
            } else {
              // Add new passenger data
              updatedStatus = `${existingStatus}:PASSENGER_DATA:${JSON.stringify(passengerDetails)}`;
              console.log('Adding new passenger data');
            }
            
            console.log(`Updated status will be: ${updatedStatus.substring(0, 50)}...`);
            
            return prisma.flightBooking.update({
              where: { id: flight.id },
              data: {
                status: updatedStatus
              }
            });
          }));
          
          console.log('Flight bookings updated successfully with passenger information');
        } catch (flightUpdateError) {
          console.error('Failed to update flight passenger details:', flightUpdateError);
          // Continue with checkout even if updates fail
        }
      }

      // Generate PDF invoice with enhanced booking information
      let pdfBuffer;
      try {
        // Re-fetch the booking to get the updated guest/passenger details
        console.log('Re-fetching booking with updated details for PDF generation');
        const bookingWithDetails = await prisma.booking.findUnique({
          where: { id: booking.id },
          include: {
            user: true,
            flights: {
              select: {
                id: true,
                flightId: true,
                flightNumber: true,
                airline: true,
                origin: true,
                destination: true,
                departureTime: true,
                arrivalTime: true,
                price: true,
                currency: true,
                status: true
                // passengerDetails field removed as it doesn't exist in the schema
              }
            },
            hotelBookings: {
              include: {
                hotel: true,
                room: true
              }
            },
            payment: true
          }
        });
        
        console.log('Generating invoice PDF for booking:', bookingWithDetails.id);
        // Check if passenger details are present in the fetched booking
        if (bookingWithDetails.flights) {
          bookingWithDetails.flights.forEach((flight, i) => {
            console.log(`Flight ${i + 1} passenger details:`, flight.status.includes(':PASSENGER_DATA:') ? flight.status.split(':PASSENGER_DATA:')[1] : 'No passenger data');
          });
        }
        // Check if guest details are present in the fetched booking
        if (bookingWithDetails.hotelBookings) {
          bookingWithDetails.hotelBookings.forEach((hotel, i) => {
            console.log(`Hotel ${i + 1} guest details:`, hotel.guestDetails);
          });
        }
        
        pdfBuffer = await generateInvoice(bookingWithDetails);
        console.log(`PDF generated successfully, buffer size: ${pdfBuffer?.length || 0} bytes`);
        
        if (!pdfBuffer || pdfBuffer.length === 0) {
          console.error('Generated PDF buffer is empty or null');
        }
      } catch (pdfError) {
        console.error('Failed to generate PDF:', pdfError);
        console.error('PDF error details:', pdfError.message);
        console.error('PDF error stack:', pdfError.stack);
        // Continue without PDF if generation fails
      }

      // Send invoice by email if user has an email and we have a PDF
      if (user.email && pdfBuffer && pdfBuffer.length > 0) {
        try {
          console.log(`Sending invoice email to ${user.email}`);
          await sendInvoiceEmail({
            to: user.email,
            subject: `Your FlyNext Travel Invoice #${updatedBooking.bookingReference || updatedBooking.id}`,
            text: `Thank you for your booking with FlyNext Travel. Your booking reference is ${updatedBooking.bookingReference || updatedBooking.id}. Please find your invoice attached.`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #0ea5e9;">FlyNext Travel</h1>
                <p>Dear ${user.firstName || 'Valued Customer'},</p>
                <p>Thank you for your booking with FlyNext Travel.</p>
                <p>Your booking reference is: <strong>${updatedBooking.bookingReference || updatedBooking.id}</strong></p>
                <p>Please find your invoice attached to this email.</p>
                <p>If you have any questions, please contact our customer service.</p>
                <p>Safe travels!</p>
                <p>FlyNext Travel Team</p>
              </div>
            `,
            pdfBuffer,
            filename: `invoice-${updatedBooking.bookingReference || updatedBooking.id}.pdf`
          });
          console.log('Invoice email sent successfully');
        } catch (emailError) {
          console.error('Failed to send invoice email:', emailError);
          if (emailError.stack) {
            console.error('Email error stack:', emailError.stack);
          }
          // Continue with the checkout process even if email fails
        }
      } else {
        console.log(`Not sending email: ${!user.email ? 'No user email' : 'No valid PDF buffer'}`);
      }

      // Send notifications to hotel owner(s) and the user
      try {
        const notificationsPromises = [];
        
        // Notify each hotel owner for each hotel booking
        if (booking.hotelBookings && Array.isArray(booking.hotelBookings)) {
          for (const hb of booking.hotelBookings) {
            notificationsPromises.push(
              prisma.notification.create({
                data: {
                  userId: hb.hotel.ownerId,
                  message: `Checkout complete: Booking for hotel "${hb.hotel.name}" has been completed.`,
                  type: 'HOTEL_CHECKOUT'
                }
              })
            );
          }
        }
        
        // Notify the user
        notificationsPromises.push(
          prisma.notification.create({
            data: {
              userId: user.id,
              message: 'Your checkout has been completed successfully.',
              type: 'CHECKOUT_CONFIRMATION'
            }
          })
        );
        
        await Promise.all(notificationsPromises);
      } catch (notifError) {
        console.error('Failed to send checkout notifications:', notifError);
        // Proceed without blocking the checkout response
      }

      return NextResponse.json({
        success: true,
        message: 'Payment successful and checkout completed',
        booking: {
          id: updatedBooking.id,
          reference: updatedBooking.bookingReference,
          status: updatedBooking.status,
          totalPrice: updatedBooking.totalPrice,
          currency: updatedBooking.currency
        },
        payment: {
          id: payment.id,
          status: payment.paymentStatus
        }
      });
    } catch (paymentError) {
      console.error('Payment creation error:', paymentError);
      
      // Log the payment error details
      console.error('Payment error details:', paymentError.message);
      
      // Try to get the Payment model definition
      try {
        const paymentModelInfo = await prisma.$queryRaw`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = 'Payment'
        `;
        console.log('Payment table columns:', paymentModelInfo);
      } catch (schemaError) {
        console.error('Failed to get schema info:', schemaError);
      }
      
      throw new Error(`Failed to create payment: ${paymentError.message}`);
    }
    
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: error.message || 'Payment processing failed' }, { status: 500 });
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
    const cardType = getCardType(cardNumber);
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

// Helper function to determine card type based on card number
function getCardType(cardNumber) {
  const firstDigit = cardNumber.charAt(0);
  
  if (cardNumber.startsWith('4')) return 'VISA';
  if (cardNumber.startsWith('5')) return 'MASTERCARD';
  if (cardNumber.startsWith('3')) return 'AMEX';
  if (cardNumber.startsWith('6')) return 'DISCOVER';
  
  return 'UNKNOWN';
}

// Generate a booking reference
function generateBookingReference() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let reference = '';
  for (let i = 0; i < 8; i++) {
    reference += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return reference;
}
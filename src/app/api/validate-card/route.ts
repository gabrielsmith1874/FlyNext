import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { cardNumber, expiryMonth, expiryYear, cvc } = body;
    
    // Basic validations for required fields
    if (!cardNumber || !expiryMonth || !expiryYear || !cvc) {
      return NextResponse.json({
        valid: false,
        message: 'All card details are required'
      }, { status: 400 });
    }
    
    // Strip spaces and non-digits from card number
    const cleanCardNumber = cardNumber.replace(/\D/g, '');
    
    // Check card number length
    if (cleanCardNumber.length < 13 || cleanCardNumber.length > 19) {
      return NextResponse.json({
        valid: false,
        message: 'Card number should be between 13 and 19 digits'
      });
    }
    
    // Luhn algorithm check
    let sum = 0;
    let shouldDouble = false;
    
    for (let i = cleanCardNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cleanCardNumber.charAt(i));
      
      if (shouldDouble) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      
      sum += digit;
      shouldDouble = !shouldDouble;
    }
    
    if (sum % 10 !== 0) {
      return NextResponse.json({
        valid: false,
        message: 'Invalid card number'
      });
    }
    
    // Expiry date validation
    const month = parseInt(expiryMonth);
    const year = parseInt(expiryYear);
    
    if (isNaN(month) || month < 1 || month > 12) {
      return NextResponse.json({
        valid: false,
        message: 'Invalid expiry month'
      });
    }
    
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // 0-based to 1-based
    
    // Handle 2-digit and 4-digit year formats
    let fullYear = year;
    if (year < 100) {
      fullYear = 2000 + year;
    }
    
    // Check if card is expired
    if (fullYear < currentYear || (fullYear === currentYear && month < currentMonth)) {
      return NextResponse.json({
        valid: false,
        message: 'Card has expired'
      });
    }
    
    // CVC validation
    const cleanCvc = cvc.replace(/\D/g, '');
    // Detect card type for proper CVC length validation
    const cardType = detectCardType(cleanCardNumber);
    const expectedCvcLength = cardType === 'AMEX' ? 4 : 3;
    
    if (cleanCvc.length !== expectedCvcLength) {
      return NextResponse.json({
        valid: false,
        message: `CVC should be ${expectedCvcLength} digits`
      });
    }
    
    // If all validations pass
    return NextResponse.json({
      valid: true,
      cardType: cardType,
      message: 'Card details are valid'
    });
    
  } catch (error) {
    console.error('Card validation error:', error);
    return NextResponse.json({
      valid: false,
      message: 'Validation failed'
    }, { status: 500 });
  }
}

// Function to detect card type based on the first few digits
function detectCardType(cardNumber) {
  // Same function as in checkout route
  const firstDigit = cardNumber.charAt(0);
  const firstTwo = cardNumber.substring(0, 2);
  const firstThree = cardNumber.substring(0, 3);
  const firstFour = cardNumber.substring(0, 4);
  const firstSix = cardNumber.substring(0, 6);
  
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
  if (firstFour === '6011' || firstSix === '622126' || firstSix === '622925' || 
      firstThree === '644' || firstThree === '645' || firstThree === '646' || 
      firstThree === '647' || firstThree === '648' || firstThree === '649' || 
      firstTwo === '65') {
    return 'DISCOVER';
  }
  
  return 'UNKNOWN';
}
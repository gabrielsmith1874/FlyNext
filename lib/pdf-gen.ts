import { jsPDF } from 'jspdf';
import { formatCurrency } from './afs-api';

interface Booking {
  bookingReference?: string;
  createdAt?: string;
  status?: string;
  user?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  };
  flights?: Flight[];
  hotelBookings?: HotelBooking[];
  payment?: {
    cardType?: string;
    cardLast4?: string;
    cardholderName?: string;
    paymentStatus?: string;
  };
  totalPrice?: number;
  currency?: string;
}

interface Flight {
  airline?: string;
  flightNumber?: string;
  origin?: string;
  destination?: string;
  departureTime?: string;
  arrivalTime?: string;
  price?: number;
  currency?: string;
  status?: string;
}

interface HotelBooking {
  hotel?: {
    name?: string;
  };
  room?: {
    type?: string;
  };
  checkInDate?: string;
  checkOutDate?: string;
  guestCount?: number;
  price?: number;
  currency?: string;
  guestDetails?: string | GuestDetails;
}

interface GuestDetails {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  specialRequests?: string;
}

/**
 * Generate an invoice PDF for a booking
 * @param booking - Booking details
 * @returns PDF buffer
 */
export async function generateInvoice(booking: Booking): Promise<Buffer> {
  try {
    const doc = new jsPDF();
    const margin = 20;
    const contentWidth = doc.internal.pageSize.width - 2 * margin;
    const pageHeight = doc.internal.pageSize.height;
    const lineHeight = 10;
    let y = margin;

    const addText = (
      text: string,
      fontSize: number = 12,
      isBold: boolean = false,
      align: 'left' | 'center' = 'left'
    ) => {
      doc.setFontSize(fontSize);
      doc.setFont('helvetica', isBold ? 'bold' : 'normal');
      const lines = doc.splitTextToSize(text, contentWidth);
      if (align === 'center') {
        doc.text(lines, doc.internal.pageSize.width / 2, y, { align: 'center' });
      } else {
        doc.text(lines, margin, y);
      }
      y += lineHeight * lines.length;
      if (y > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
    };

    // Header
    addText('FlyNext Travel', 20, true, 'center');
    addText('Invoice', 16, false, 'center');
    y += 5;
    doc.setLineWidth(0.5);
    doc.line(margin, y, doc.internal.pageSize.width - margin, y);
    y += 10;

    // Booking info
    addText('Booking Information', 14, true);
    addText(`Reference: ${booking.bookingReference || 'N/A'}`);
    addText(`Date: ${booking.createdAt ? new Date(booking.createdAt).toLocaleDateString() : 'N/A'}`);
    addText(`Status: ${booking.status || 'N/A'}`);

    // Customer info
    y += 5;
    addText('Customer Information', 14, true);
    if (booking.user) {
      addText(`Name: ${booking.user.firstName || ''} ${booking.user.lastName || ''}`);
      addText(`Email: ${booking.user.email || 'N/A'}`);
      if (booking.user.phone) addText(`Phone: ${booking.user.phone}`);
    } else {
      addText('Customer information not available');
    }

    // Flight details
    if (booking.flights && booking.flights.length > 0) {
      y += 5;
      addText('Flight Details', 14, true);
      booking.flights.forEach((flight, index) => {
        addText(`Flight ${index + 1}: ${flight.airline || 'N/A'} ${flight.flightNumber || 'N/A'}`);
        addText(`From: ${flight.origin || 'N/A'} to ${flight.destination || 'N/A'}`);
        addText(`Departure: ${flight.departureTime ? new Date(flight.departureTime).toLocaleString() : 'N/A'}`);
        addText(`Arrival: ${flight.arrivalTime ? new Date(flight.arrivalTime).toLocaleString() : 'N/A'}`);
        addText(`Price: ${formatCurrency(flight.price || 0, flight.currency || 'USD')}`);
        y += 5;
      });
    }

    // Hotel details
    if (booking.hotelBookings && booking.hotelBookings.length > 0) {
      y += 5;
      addText('Hotel Details', 14, true);
      booking.hotelBookings.forEach((hotelBooking, index) => {
        addText(`Hotel ${index + 1}: ${hotelBooking.hotel?.name || 'N/A'}`);
        addText(`Room Type: ${hotelBooking.room?.type || 'N/A'}`);
        addText(`Check-in: ${hotelBooking.checkInDate || 'N/A'}`);
        addText(`Check-out: ${hotelBooking.checkOutDate || 'N/A'}`);
        addText(`Guests: ${hotelBooking.guestCount || 'N/A'}`);
        addText(`Price: ${formatCurrency(hotelBooking.price || 0, hotelBooking.currency || 'USD')}`);
        y += 5;
      });
    }

    // Payment info
    y += 5;
    addText('Payment Information', 14, true);
    if (booking.payment) {
      addText(`Payment Method: ${booking.payment.cardType || 'N/A'} ending in ${booking.payment.cardLast4 || 'N/A'}`);
      addText(`Cardholder Name: ${booking.payment.cardholderName || 'N/A'}`);
      addText(`Payment Status: ${booking.payment.paymentStatus || 'N/A'}`);
    } else {
      addText('Payment information not available');
    }
    addText(`Total Amount: ${formatCurrency(booking.totalPrice || 0, booking.currency || 'USD')}`);

    // Footer
    y = pageHeight - margin;
    doc.setFontSize(8);
    doc.text(
      'Thank you for choosing FlyNext Travel. This is an electronically generated invoice and does not require a signature.',
      doc.internal.pageSize.width / 2,
      y,
      { align: 'center' }
    );

    return Buffer.from(doc.output('arraybuffer'));
  } catch (error) {
    console.error('PDF generation error:', error);
    throw error;
  }
}
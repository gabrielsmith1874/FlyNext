import { jsPDF } from 'jspdf';
import { formatCurrency } from './afs-api';

export async function generateInvoice(booking) {
  try {
    // Create a new PDF document
    const doc = new jsPDF();
    
    // Set some properties
    const lineHeight = 10;
    let y = 20;
    
    // Helper function for adding text
    const addText = (text, fontSize = 12, isBold = false, align = 'left') => {
      doc.setFontSize(fontSize);
      if (isBold) {
        doc.setFont('helvetica', 'bold');
      } else {
        doc.setFont('helvetica', 'normal');
      }
      
      if (align === 'center') {
        doc.text(text, doc.internal.pageSize.width / 2, y, { align: 'center' });
      } else {
        doc.text(text, 20, y);
      }
      y += lineHeight;
    };
    
    // Header
    addText('FlyNext Travel', 20, true, 'center');
    addText('Invoice', 16, false, 'center');
    
    // Line
    y += 5;
    doc.setLineWidth(0.5);
    doc.line(20, y, 190, y);
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
      addText("Customer information not available");
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
        y += 2;
      });
    }
    
    // Add second page if needed
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    
    // Hotel bookings
    if (booking.hotelBookings && booking.hotelBookings.length > 0) {
      y += 5;
      addText('Hotel Details', 14, true);
      
      booking.hotelBookings.forEach((hotelBooking) => {
        const hotel = hotelBooking.hotel || {};
        const room = hotelBooking.room || {};
        
        addText(`Hotel: ${hotel.name || 'N/A'}`);
        addText(`Room Type: ${room.type || 'N/A'}`);
        addText(`Check-in: ${hotelBooking.checkInDate ? new Date(hotelBooking.checkInDate).toLocaleDateString() : 'N/A'}`);
        addText(`Check-out: ${hotelBooking.checkOutDate ? new Date(hotelBooking.checkOutDate).toLocaleDateString() : 'N/A'}`);
        addText(`Guests: ${hotelBooking.guestCount || 'N/A'}`);
        addText(`Price: ${formatCurrency(hotelBooking.price || 0, hotelBooking.currency || 'USD')}`);
        y += 2;
      });
    }
    
    // Add third page if needed
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    
    // Payment info
    y += 5;
    addText('Payment Information', 14, true);
    if (booking.payment) {
      addText(`Payment Method: ${booking.payment.cardType || 'N/A'} ending in ${booking.payment.cardLast4 || 'N/A'}`);
      addText(`Payment Status: ${booking.payment.paymentStatus || 'N/A'}`);
    } else {
      addText("Payment information not available");
    }
    addText(`Total Amount: ${formatCurrency(booking.totalPrice || 0, booking.currency || 'USD')}`);
    
    // Footer
    y = 280;
    doc.setFontSize(8);
    doc.text('Thank you for choosing FlyNext Travel. This is an electronically generated invoice and does not require a signature.', 
      doc.internal.pageSize.width / 2, y, { align: 'center' });
      
    // Return the PDF as a buffer
    return Buffer.from(doc.output('arraybuffer'));
  } catch (error) {
    console.error('PDF generation error:', error);
    
    // Create a simple error page with a new instance instead of reassigning
    const errorDoc = new jsPDF();
    errorDoc.setFontSize(14);
    errorDoc.text('Error generating complete invoice', 20, 20);
    errorDoc.setFontSize(12);
    errorDoc.text(`Booking Reference: ${booking.bookingReference || 'N/A'}`, 20, 40);
    errorDoc.text(`Total Amount: ${formatCurrency(booking.totalPrice || 0, booking.currency || 'USD')}`, 20, 50);
    
    // Return the error PDF
    return Buffer.from(errorDoc.output('arraybuffer'));
  }
}
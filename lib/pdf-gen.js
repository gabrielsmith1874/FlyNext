import { jsPDF } from 'jspdf';
import { formatCurrency } from './afs-api';

export async function generateInvoice(booking) {
  try {
    // Create a new PDF document
    const doc = new jsPDF();
    
    // Define margins and dimensions
    const margin = 20;
    const contentWidth = doc.internal.pageSize.width - 2 * margin;
    const pageHeight = doc.internal.pageSize.height;
    const lineHeight = 10;
    let y = margin;
    
    // Helper function for adding text with wrapping and custom alignment
    const addText = (text, fontSize = 12, isBold = false, align = 'left') => {
      doc.setFontSize(fontSize);
      if (isBold) {
        doc.setFont('helvetica', 'bold');
      } else {
        doc.setFont('helvetica', 'normal');
      }
      const lines = doc.splitTextToSize(text, contentWidth);
      if (align === 'center') {
        doc.text(lines, doc.internal.pageSize.width / 2, y, { align: 'center' });
      } else {
        // For left-aligned text, we center the text block by using the margin
        doc.text(lines, margin, y);
      }
      y += lineHeight * lines.length;
      // Add a new page if y exceeds available height
      if (y > (pageHeight - margin)) {
        doc.addPage();
        y = margin;
      }
    };

    // Header
    addText('FlyNext Travel', 20, true, 'center');
    addText('Invoice', 16, false, 'center');
    
    // Line
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
      addText("Customer information not available");
    }
    
    // Group connecting flights
    const processConnectingFlights = (flights) => {
      // Map to store flight groups by connection reference
      const flightGroups = new Map();
      
      // First pass: identify and group connecting flights
      flights.forEach(flight => {
        if (flight.status && flight.status.includes(':CONNECTION_REF:')) {
          // Extract connection reference
          const connectionMatch = flight.status.match(/:CONNECTION_REF:([^:]+):/);
          if (connectionMatch && connectionMatch[1]) {
            const connectionRef = connectionMatch[1];
            
            if (!flightGroups.has(connectionRef)) {
              flightGroups.set(connectionRef, []);
            }
            
            // Extract segment information
            const segmentMatch = flight.status.match(/:SEGMENT:(\d+):OF:(\d+)/);
            const segmentInfo = segmentMatch ? {
              index: parseInt(segmentMatch[1]),
              total: parseInt(segmentMatch[2])
            } : { index: 0, total: 0 };
            
            flightGroups.get(connectionRef).push({
              ...flight,
              segmentInfo
            });
          }
        }
      });
      
      // Second pass: structure flight data for display
      const processedFlights = [];
      
      // Add non-connecting flights directly
      flights.forEach(flight => {
        if (!flight.status || !flight.status.includes(':CONNECTION_REF:')) {
          processedFlights.push({ 
            type: 'single', 
            flight 
          });
        }
      });
      
      // Add connecting flight bundles
      flightGroups.forEach((group, connectionRef) => {
        // Sort by segment index
        group.sort((a, b) => a.segmentInfo.index - b.segmentInfo.index);
        
        processedFlights.push({
          type: 'connecting',
          flights: group,
          connectionRef
        });
      });
      
      return processedFlights;
    };
    
    // Group the flights for better display in the invoice
    const flightGroups = booking.flights ? processConnectingFlights(booking.flights) : [];
      
    // Flight details with passenger information
    if (flightGroups.length > 0) {
      y += 5;
      addText('Flight Details', 14, true);
      
      flightGroups.forEach((flightGroup, groupIndex) => {
        if (flightGroup.type === 'single') {
          // Single flight display
          const flight = flightGroup.flight;
          
          addText(`Flight ${groupIndex + 1}: ${flight.airline || 'N/A'} ${flight.flightNumber || 'N/A'}`);
          addText(`From: ${flight.origin || 'N/A'} to ${flight.destination || 'N/A'}`);
          addText(`Departure: ${flight.departureTime ? new Date(flight.departureTime).toLocaleString() : 'N/A'}`);
          addText(`Arrival: ${flight.arrivalTime ? new Date(flight.arrivalTime).toLocaleString() : 'N/A'}`);
          addText(`Price: ${formatCurrency(flight.price || 0, flight.currency || 'USD')}`);
          
          // Add a visual separator
          y += 2;
          
          // Enhanced passenger details section - Always include this section
          addText('Passenger Information:', 12, true);
          
          // Try to extract passenger details from status field
          let passengerDetails = null;
          // Improve the passenger details extraction in your PDF generation
          if (flight.status && flight.status.includes(':PASSENGER_DATA:')) {
            try {
              const passengerDataIndex = flight.status.indexOf(':PASSENGER_DATA:') + ':PASSENGER_DATA:'.length;
              const passengerDataJson = flight.status.substring(passengerDataIndex);
              
              // Add more robust error checking and logging
              console.log(`Processing passenger data: ${passengerDataJson}`);
              
              // Handle both string and object formats
              if (typeof passengerDataJson === 'string') {
                passengerDetails = JSON.parse(passengerDataJson);
              } else {
                passengerDetails = passengerDataJson;
              }
              
              console.log('Successfully parsed passenger details:', passengerDetails);
            } catch (e) {
              console.error(`Error parsing passenger data: ${e.message}`);
            }
          }
          
          // Display passenger information with better fallbacks
          if (passengerDetails && (passengerDetails.firstName || passengerDetails.lastName)) {
            // Use the passenger details from the flight status
            const fullName = `${passengerDetails.firstName || ''} ${passengerDetails.lastName || ''}`.trim();
            addText(`  Name: ${fullName || 'Unnamed Passenger'}`, 11);
            if (passengerDetails.email) addText(`  Email: ${passengerDetails.email}`, 11);
            if (passengerDetails.phone) addText(`  Phone: ${passengerDetails.phone}`, 11);
            if (passengerDetails.passportNumber) addText(`  Passport: ${passengerDetails.passportNumber}`, 11);
            if (passengerDetails.dateOfBirth) addText(`  Date of Birth: ${passengerDetails.dateOfBirth}`, 11);
            if (passengerDetails.nationality) addText(`  Nationality: ${passengerDetails.nationality}`, 11);
            if (passengerDetails.specialRequests) addText(`  Special Requests: ${passengerDetails.specialRequests}`, 11);
          } else {
            // Improved fallback message
            console.log('No valid passenger details found in flight status, checking booking user');
            if (booking.user && (booking.user.firstName || booking.user.lastName)) {
              const userName = `${booking.user.firstName || ''} ${booking.user.lastName || ''}`.trim();
              addText(`  Name: ${userName || 'Unnamed Passenger'}`, 11);
              if (booking.user.email) addText(`  Email: ${booking.user.email}`, 11);
              if (booking.user.phone) addText(`  Phone: ${booking.user.phone}`, 11);
            } else {
              addText(`  Name: Guest Traveler (No passenger details provided)`, 11);
            }
          }
          
          // Add space between flight entries
          y += 5;
        } else {
          // Connecting flights display
          const flights = flightGroup.flights;
          const origin = flights[0].origin || 'N/A';
          const finalDestination = flights[flights.length - 1].destination || 'N/A';
          
          // Calculate total price and duration
          const totalPrice = flights.reduce((sum, flight) => sum + (flight.price || 0), 0);
          
          // Main connecting flight information
          addText(`Connected Journey ${groupIndex + 1}: ${origin} to ${finalDestination}`, 12, true);
          addText(`Total segments: ${flights.length}`);
          addText(`Total price: ${formatCurrency(totalPrice, flights[0].currency || 'USD')}`);
          
          y += 2;
          
          // Display each segment
          flights.forEach((flight, segmentIndex) => {
            addText(`Segment ${segmentIndex + 1}: ${flight.airline || 'N/A'} ${flight.flightNumber || 'N/A'}`);
            addText(`From: ${flight.origin || 'N/A'} to ${flight.destination || 'N/A'}`);
            addText(`Departure: ${flight.departureTime ? new Date(flight.departureTime).toLocaleString() : 'N/A'}`);
            addText(`Arrival: ${flight.arrivalTime ? new Date(flight.arrivalTime).toLocaleString() : 'N/A'}`);
            addText(`Price: ${formatCurrency(flight.price || 0, flight.currency || 'USD')}`);
            
            if (segmentIndex < flights.length - 1) {
              addText(`Connection time: ${calculateConnectionTime(flight, flights[segmentIndex + 1])}`);
            }
            
            if (segmentIndex < flights.length - 1) {
              y += 1;
              doc.setDrawColor(200, 200, 200);
              doc.line(margin, y, contentWidth + margin, y);
              y += 1;
            }
          });
          
          y += 2;
          
          // Enhanced passenger details section - Always include this section
          addText('Passenger Information:', 12, true);
          
          // Try to extract passenger details - we'll use the first flight's details for the entire journey
          let passengerDetails = null;
          if (flights[0].status && flights[0].status.includes(':PASSENGER_DATA:')) {
            try {
              const passengerDataIndex = flights[0].status.indexOf(':PASSENGER_DATA:') + ':PASSENGER_DATA:'.length;
              const passengerDataJson = flights[0].status.substring(passengerDataIndex);
              console.log(`Extracted passenger data JSON for PDF: ${passengerDataJson.substring(0, 100)}...`);
              passengerDetails = JSON.parse(passengerDataJson);
              console.log('Parsed passenger details for PDF:', passengerDetails);
            } catch (e) {
              console.error(`Failed to parse passenger details from status field for flight ${flights[0].id}:`, e);
            }
          }
          
          if (passengerDetails && (passengerDetails.firstName || passengerDetails.lastName)) {
            const fullName = `${passengerDetails.firstName || ''} ${passengerDetails.lastName || ''}`.trim();
            addText(`  Name: ${fullName || 'Unnamed Passenger'}`, 11);
            if (passengerDetails.email) addText(`  Email: ${passengerDetails.email}`, 11);
            if (passengerDetails.phone) addText(`  Phone: ${passengerDetails.phone}`, 11);
            if (passengerDetails.passportNumber) addText(`  Passport: ${passengerDetails.passportNumber}`, 11);
            if (passengerDetails.dateOfBirth) addText(`  Date of Birth: ${passengerDetails.dateOfBirth}`, 11);
            if (passengerDetails.nationality) addText(`  Nationality: ${passengerDetails.nationality}`, 11);
            if (passengerDetails.specialRequests) addText(`  Special Requests: ${passengerDetails.specialRequests}`, 11);
          } else {
            console.log('No valid passenger details found in flight status, checking booking user');
            if (booking.user && (booking.user.firstName || booking.user.lastName)) {
              const userName = `${booking.user.firstName || ''} ${booking.user.lastName || ''}`.trim();
              addText(`  Name: ${userName || 'Unnamed Passenger'}`, 11);
              if (booking.user.email) addText(`  Email: ${booking.user.email}`, 11);
              if (booking.user.phone) addText(`  Phone: ${booking.user.phone}`, 11);
            } else {
              addText(`  Name: Guest Traveler (No passenger details provided)`, 11);
            }
          }
          
          y += 5;
        }
      });
    }
    
    // Hotel bookings with enhanced guest information
    if (booking.hotelBookings && booking.hotelBookings.length > 0) {
      y += 5;
      addText('Hotel Details', 14, true);
      
      booking.hotelBookings.forEach((hotelBooking, index) => {
        const hotel = hotelBooking.hotel || {};
        const room = hotelBooking.room || {};
        
        // Hotel information section
        addText(`Hotel ${index + 1}: ${hotel.name || 'N/A'}`);
        addText(`Room Type: ${room.type || 'N/A'}`);
        addText(`Check-in: ${hotelBooking.checkInDate ? new Date(hotelBooking.checkInDate).toLocaleDateString() : 'N/A'}`);
        addText(`Check-out: ${hotelBooking.checkOutDate ? new Date(hotelBooking.checkOutDate).toLocaleDateString() : 'N/A'}`);
        addText(`Guests: ${hotelBooking.guestCount || 'N/A'}`);
        addText(`Price: ${formatCurrency(hotelBooking.price || 0, hotelBooking.currency || 'USD')}`);
        
        // Add a visual separator
        y += 2;
        
        // Enhanced guest details section - Always include this section
        addText('Guest Information:', 12, true);
        
        // Try to parse guest details if available
        let guestDetails = null;
        if (hotelBooking.guestDetails) {
          try {
            if (typeof hotelBooking.guestDetails === 'string') {
              guestDetails = JSON.parse(hotelBooking.guestDetails);
              console.log(`Parsed hotel guest details for PDF: ${JSON.stringify(guestDetails).substring(0, 100)}...`);
            } else if (typeof hotelBooking.guestDetails === 'object') {
              guestDetails = hotelBooking.guestDetails;
            }
          } catch (e) {
            console.error(`Failed to parse guest details for hotel booking ${hotelBooking.id}:`, e);
          }
        }
        
        // Display guest information (even if limited)
        if (guestDetails && (guestDetails.firstName || guestDetails.lastName)) {
          const fullName = `${guestDetails.firstName || ''} ${guestDetails.lastName || ''}`.trim();
          addText(`  Name: ${fullName || 'Unnamed Guest'}`, 11);
          if (guestDetails.email) addText(`  Email: ${guestDetails.email}`, 11);
          if (guestDetails.phone) addText(`  Phone: ${guestDetails.phone}`, 11);
          if (guestDetails.address) addText(`  Address: ${guestDetails.address}`, 11);
          if (guestDetails.city) addText(`  City: ${guestDetails.city}`, 11);
          if (guestDetails.country) addText(`  Country: ${guestDetails.country}`, 11);
          if (guestDetails.postalCode) addText(`  Postal Code: ${guestDetails.postalCode}`, 11);
          if (guestDetails.specialRequests) addText(`  Special Requests: ${guestDetails.specialRequests}`, 11);
        } else {
          // If no guest details, use booking customer info as fallback
          if (booking.user) {
            const userName = `${booking.user.firstName || ''} ${booking.user.lastName || ''}`.trim();
            addText(`  Name: ${userName || 'Unnamed Guest'}`, 11);
            if (booking.user.email) addText(`  Email: ${booking.user.email}`, 11);
            if (booking.user.phone) addText(`  Phone: ${booking.user.phone}`, 11);
            addText(`  Note: Using account information (no specific guest details provided)`, 11);
          } else {
            addText(`  Guest details not available`, 11);
          }
        }
        
        // Add space between hotel entries
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
      addText("Payment information not available");
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

// Helper function to calculate connection time between flights
function calculateConnectionTime(departureFlight, arrivalFlight) {
  if (!departureFlight.arrivalTime || !arrivalFlight.departureTime) {
    return 'Unknown';
  }
  
  const arrivalTime = new Date(departureFlight.arrivalTime);
  const departureTime = new Date(arrivalFlight.departureTime);
  
  const diffMs = departureTime.getTime() - arrivalTime.getTime();
  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  return `${diffHrs}h ${diffMins}m`;
}
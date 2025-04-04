// ...existing code...

// Make sure this function is properly implemented for round-trip searches
export async function searchRoundTripFlights(origin, destination, departureDate, returnDate) {
  try {
    const API_KEY = process.env.AFS_API_KEY || "0da1159fbf062d8e8b4650679aa39a7aefbcb6b3f6a455a0acc7345b8fb65a05";
    
    // First fetch the outbound flights
    const outboundResponse = await fetch(
      `https://advanced-flights-system.replit.app/api/flights?origin=${origin}&destination=${destination}&date=${departureDate}`,
      {
        headers: {
          'x-api-key': API_KEY
        }
      }
    );
    
    if (!outboundResponse.ok) {
      throw new Error(`Outbound search failed: ${outboundResponse.statusText}`);
    }
    
    // Then fetch the return flights
    const returnResponse = await fetch(
      `https://advanced-flights-system.replit.app/api/flights?origin=${destination}&destination=${origin}&date=${returnDate}`,
      {
        headers: {
          'x-api-key': API_KEY
        }
      }
    );
    
    if (!returnResponse.ok) {
      throw new Error(`Return search failed: ${returnResponse.statusText}`);
    }
    
    const outboundData = await outboundResponse.json();
    const returnData = await returnResponse.json();
    
    return {
      outbound: outboundData.results || [],
      return: returnData.results || [],
      currency: outboundData.currency || 'USD'
    };
  } catch (error) {
    console.error('Round trip search error:', error);
    throw error;
  }
}

// ...existing code...

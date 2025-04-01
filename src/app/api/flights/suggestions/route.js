import { NextResponse } from 'next/server';
import { searchFlights } from '@/lib/afs-api';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const destination = searchParams.get('destination');
    const departureDate = searchParams.get('departureDate'); 
    const limit = parseInt(searchParams.get('limit') || '3', 10);
    
    if (!destination) {
      return NextResponse.json(
        { error: 'Destination city is required' },
        { status: 400 }
      );
    }
    
    console.log(`Searching for flights to ${destination} on ${departureDate}`);
    
    // Default to 7 days from now if no date provided
    const date = departureDate || 
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // Include more cities that might have flights to Manila
    const popularOrigins = ['Toronto', 'New York', 'Los Angeles', 'Singapore', 'Hong Kong'];
    
    // Add debugging to track API calls
    const flightPromises = popularOrigins.map(async origin => {
      console.log(`Searching flights from ${origin} to ${destination}`);
      
      try {
        const results = await searchFlights(origin, destination, date);
        console.log(`Found ${results?.results?.length || 0} flights from ${origin} to ${destination}`);
        
        return {
          origin,
          flights: results?.results || []
        };
      } catch (error) {
        console.error(`Error searching flights from ${origin}:`, error.message);
        return { origin, flights: [] };
      }
    });
    
    const flightResults = await Promise.all(flightPromises);
    
    // Add more logging to debug the results
    flightResults.forEach(result => {
      console.log(`${result.origin} → ${destination}: ${result.flights.length} flights found`);
    });
    
    // Flatten and filter
    const suggestedFlights = flightResults
      .flatMap(result => 
        (result.flights || []).map(flight => ({
          ...flight,
          originCity: result.origin
        }))
      );
    
    console.log(`Returning ${suggestedFlights.length} total flight suggestions`);
    
    return NextResponse.json(suggestedFlights);
  } catch (error) {
    console.error('Flight suggestions error:', error);
    return NextResponse.json(
      { error: 'Failed to get flight suggestions', details: error.message },
      { status: 500 }
    );
  }
}
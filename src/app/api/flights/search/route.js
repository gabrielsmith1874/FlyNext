import { NextResponse } from 'next/server';
import { searchFlights, getCities, searchRoundTripFlights } from '../../../../../lib/afs-api';
import { verifyToken } from '../../../../../lib/auth';

// Create a cache to avoid fetching cities on every request
let citiesCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 3600000; // 1 hour in milliseconds

/**
 * Get cities list with caching
 * @returns {Promise<Array>} - List of cities
 */
async function getCitiesWithCache() {
  const now = Date.now();
  
  // If cache exists and is still valid, use it
  if (citiesCache && cacheTimestamp && now - cacheTimestamp < CACHE_DURATION) {
    return citiesCache;
  }
  
  // Otherwise fetch fresh data
  try {
    const response = await getCities();
    // Check if we have the expected cities array
    if (response && Array.isArray(response)) {
      citiesCache = response;
      cacheTimestamp = now;
      return response;
    } else {
      console.error('Unexpected response format from getCities():', response);
      return [];
    }
  } catch (error) {
    console.error('Failed to fetch cities:', error);
    return [];
  }
}

/**
 * Autocomplete city name from partial input
 * @param {string} partialName - Partial city name
 * @returns {Promise<string>} - Full city name if match found, otherwise returns the input
 */
async function autoCompleteCity(partialName) {
  if (!partialName) return partialName;
  
  // New: if input is exactly three letters, assume it's an airport code
  if (partialName.length === 3 && /^[A-Za-z]{3}$/.test(partialName)) {
    const code = partialName.toUpperCase();
    console.log(`Assuming airport code: ${code}`);
    return code;
  }
  
  try {
    const cities = await getCitiesWithCache();
    console.log(`Cities cache has ${cities.length} cities`);
    
    const normalizedInput = partialName.toLowerCase();
    console.log(`Looking for city matching: ${normalizedInput}`);
    
    // Find exact matches first
    const exactMatch = cities.find(city => 
      city.city.toLowerCase() === normalizedInput
    );
    
    if (exactMatch) {
      console.log(`Found exact match: ${exactMatch.city}`);
      return exactMatch.city;
    }
    
    // Then find prefix matches
    const prefixMatch = cities.find(city => 
      city.city.toLowerCase().startsWith(normalizedInput)
    );
    
    if (prefixMatch) {
      console.log(`Found prefix match: ${prefixMatch.city}`);
      return prefixMatch.city;
    }
    
    console.log(`No match found for: ${normalizedInput}`);
    return partialName;
  } catch (error) {
    console.error('City autocomplete error:', error);
    return partialName;
  }
}

export async function GET(request) {
  console.log('GET request to /api/flights/search');
  
  // Authorization check
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const token = authHeader.split(' ')[1];
  const user = await verifyToken(token);
  if (!user) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    let origin = searchParams.get('from');
    let destination = searchParams.get('to');
    const date = searchParams.get('date');
    const returnDate = searchParams.get('returnDate');
    const tripType = searchParams.get('tripType');
    
    console.log('Search params:', { origin, destination, date, returnDate, tripType });
    
    // Validate required parameters
    if (!origin || !destination || !date) {
      return NextResponse.json(
        { error: 'Origin, destination, and date are required' },
        { status: 400 }
      );
    }
    
    // Autocomplete city names if needed
    origin = await autoCompleteCity(origin);
    destination = await autoCompleteCity(destination);
    
    // Handle round trip searches
    if (tripType === 'round-trip' && returnDate) {
      console.log(`Searching round-trip flights from ${origin} to ${destination} on ${date} with return on ${returnDate}`);
      
      try {
        const data = await searchRoundTripFlights(origin, destination, date, returnDate);
        // Ensure data is safe
        const outbound = Array.isArray(data?.outbound) ? data.outbound : [];
        const ret = Array.isArray(data?.returnFlights) ? data.returnFlights : []; // updated key
        console.log(`Round-trip search results: outbound=${outbound.length}, returnFlights=${ret.length}`);
        return NextResponse.json({ outbound, returnFlights: ret });
      } catch (searchError) {
        console.error('Round-trip search error:', searchError);
        return NextResponse.json({ error: searchError.message }, { status: 500 });
      }
    } else {
      // For one-way flights, continue with your existing code
      console.log(`Searching one-way flights from ${origin} to ${destination} on ${date}`);
      
      try {
        const data = await searchFlights(origin, destination, date);
        return NextResponse.json(data);
      } catch (searchError) {
        console.error('Flight search error:', searchError);
        return NextResponse.json({ results: [] });
      }
    }
  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json(
      { error: 'Failed to search flights' },
      { status: 500 }
    );
  }
}
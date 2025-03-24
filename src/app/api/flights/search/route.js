import { NextResponse } from 'next/server';
import { searchFlights, getCities } from '../../../../../lib/afs-api';
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
    
    // Validate required parameters
    if (!origin || !destination || !date) {
      return NextResponse.json(
        { error: 'Origin, destination, and date are required' },
        { status: 400 }
      );
    }
    
    // Autocomplete city names
    origin = await autoCompleteCity(origin);
    destination = await autoCompleteCity(destination);
    
    console.log(`Searching flights from ${origin} to ${destination} on ${date}`);
    
    try {
      // Search flights
      const data = await searchFlights(origin, destination, date);
      // Extract flights array from the returned data
      let flights = data?.results ?? data;
      if (!Array.isArray(flights)) flights = [];
      
      // Wrap the flights in the expected structure and respond with it
      return NextResponse.json({ results: [{ legs: 1, flights }] });
    } catch (searchError) {
      // For city not found or other API-specific errors, return empty results
      console.log('Flight search found no results or city not found:', searchError.message);
      return NextResponse.json({ results: [] });
    }
  } catch (error) {
    console.error('Flight search error:', error);
    return NextResponse.json(
      { error: 'Failed to search flights' },
      { status: 500 }
    );
  }
}
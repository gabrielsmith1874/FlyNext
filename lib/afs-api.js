/**
 * Advanced Flights System (AFS) API client
 */
require('dotenv').config();
import fetch from 'node-fetch';

const API_KEY = process.env.AFS_API_KEY || '0da1159fbf062d8e8b4650679aa39a7aefbcb6b3f6a455a0acc7345b8fb65a05';
const BASE_URL = process.env.AFS_BASE_URL || (process.env.DOCKER_ENV === 'true' ? 'http://afs-main:3001' : 'http://localhost:3001');


const fetchFn =
  typeof window === 'undefined'
    ? fetch  // replaced dynamic import with 'fetch' from node-fetch
    : window.fetch;

/**
 * Make a request to the AFS API
 * @param {string} endpoint - API endpoint
 * @param {string} method - HTTP method
 * @param {object} body - Request body for POST requests
 * @param {number} retries - Number of retry attempts
 * @returns {Promise<any>} - API response
 */
async function makeRequest(endpoint, method = 'GET', body = null, retries = 3) {
  let url;

  // Determine the base URL for the request
  if (endpoint.startsWith('/api/proxy')) {
    // Proxy requests should use the FlyNext service URL
    const base = typeof window === 'undefined'
      ? process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
      : '';
    url = `${base}${endpoint}`;
  } else {
    // Direct requests should use the hardcoded AFS API base URL
    url = `${BASE_URL}${endpoint}`;
  }

  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': API_KEY,
  };

  const options = {
    method,
    headers,
    timeout: 15000, // 15 seconds timeout
  };

  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Making request to: ${url}`);
      const response = await fetch(url, options);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AFS API error (${response.status}): ${errorText}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error.message);
      if (attempt === retries) {
        throw error;
      }
    }
  }
}

export async function searchRoundTripFlights(from, to, date, returnDate) {
  try {
    const outboundResponse = await searchFlights(from, to, date);
    const returnResponse = await searchFlights(to, from, returnDate);
    
    // Updated extraction logic
    function extractFlights(response) {
      // New: if response is an array, return it directly
      if (Array.isArray(response)) {
        return response;
      }
      try {
        if (!response.results || !Array.isArray(response.results)) {
          return [];
        }
        
        const flights = [];
        
        if (response.results.length > 0) {
          const firstResult = response.results[0];
          
          if (firstResult.flights && Array.isArray(firstResult.flights)) {
            
            firstResult.flights.forEach((flightItem, i) => {
              
              if (flightItem.id) {
                flights.push(flightItem);
              } else if (flightItem.flights && Array.isArray(flightItem.flights)) {
                flightItem.flights.forEach(flight => {
                  flights.push(flight);
                });
              } else if (typeof flightItem === 'object') {
                flights.push(flightItem);
              }
            });
          }
        }
        
        return flights;
      } catch (extractError) {
        console.error('Error extracting flights:', extractError);
        return [];
      }
    }
    
    const outboundFlights = extractFlights(outboundResponse);
    const returnFlights = extractFlights(returnResponse);
    return {
      outbound: outboundFlights,
      returnFlights // changed key from "return" to "returnFlights"
    };
  } catch (error) {
    console.error('Error in searchRoundTripFlights:', error);
    return { outbound: [], returnFlights: [] };
  }
}

/**
 * Get all cities from AFS
 * @returns {Promise<Array>} - List of cities
 */
export async function getCities() {
  return makeRequest('/api/cities');
}

/**
 * Get all airports from AFS
 * @returns {Promise<Array>} - List of airports
 */
export async function getAirports() {
  return makeRequest('/api/airports');
}

/**
 * Get all airlines from AFS
 * @returns {Promise<Array>} - List of airlines
 */
export async function getAirlines() {
  return makeRequest('/api/airlines');
}

/**
 * Search for flights through the proxy endpoint
 * @param {string} origin - Origin city or airport code
 * @param {string} destination - Destination city or airport code
 * @param {string} date - Flight date in YYYY-MM-DD format
 * @returns {Promise<Object>} - Flight search results
 */
export async function searchFlights(origin, destination, date) {
  const queryParams = new URLSearchParams({ origin, destination, date }).toString();
  // Use local proxy endpoint instead of remote AFS API
  return makeRequest(`/api/proxy/flights?${queryParams}`);
}

/**
 * Format a number as currency
 * @param {number} amount - The amount to format
 * @param {string} currency - Currency code (USD, EUR, etc)
 * @returns {string} - Formatted currency string
 */
export function formatCurrency(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
}

/**
 * Book flights
 * @param {object} bookingData - Booking data
 * @returns {Promise<Object>} - Booking confirmation
 */
export async function bookFlights(bookingData) {
  return makeRequest('/api/bookings', 'POST', bookingData);
}

/**
 * Retrieve a booking
 * @param {string} lastName - Passenger's last name
 * @param {string} bookingReference - Booking reference
 * @returns {Promise<Object>} - Booking details
 */
export async function retrieveBooking(lastName, bookingReference) {
  const queryParams = new URLSearchParams({
    lastName,
    bookingReference
  }).toString();
  
  return makeRequest(`/api/bookings/retrieve?${queryParams}`);
}

export async function searchLocations(query, limit = 10) {
  const queryParams = new URLSearchParams({
    query,
    limit: limit.toString()
  }).toString();
  
  return makeRequest(`/api/locations/search?${queryParams}`);
}

/**
 * Book a hotel room or add to cart
 * @param {Object} bookingData - Hotel booking data including hotelId, roomType, guestDetails, etc.
 * @returns {Promise<Object>} - Booking reference or cart confirmation
 */
export async function bookHotel(bookingData) {
  try {
    console.log('Preparing hotel cart request:', bookingData);
    
    // Ensure required fields are present
    if (!bookingData.hotelId) throw new Error('Hotel ID is required');
    if (!bookingData.roomId) throw new Error('Room ID is required');
    if (!bookingData.checkInDate) throw new Error('Check-in date is required');
    if (!bookingData.checkOutDate) throw new Error('Check-out date is required');
    
    // Create a specific hotel booking request
    // IMPORTANT: Make sure status is explicitly set to 'PENDING'
    const requestData = {
      // Guest information - empty object if not provided
      guestDetails: bookingData.guestDetails || {},
      
      // Hotel specific fields
      hotelId: bookingData.hotelId,
      roomId: bookingData.roomId,
      roomType: bookingData.roomType,
      checkInDate: bookingData.checkInDate,
      checkOutDate: bookingData.checkOutDate,
      guestCount: bookingData.guestCount || 1,
      price: bookingData.totalPrice || 0,
      currency: bookingData.currency || 'USD',
      
      // CRUCIAL: Set both the top-level and booking-specific status to PENDING
      status: 'PENDING',
      bookingStatus: 'PENDING',
      addToCart: true,  // Add a flag to indicate this should go to cart
      skipConfirmation: true  // Signal to backend not to auto-confirm
    };
    
    console.log('Sending hotel booking request:', requestData);
    
    // Get the auth token - try both possible storage keys
    const token = localStorage.getItem('token') || localStorage.getItem('authToken');
    if (!token) {
      throw new Error('Authentication required. Please log in.');
    }
    
    // Use a specific hotel bookings endpoint
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/hotels/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(requestData)
    });
    
    console.log('Response status:', response.status);
    
    // Check for error responses
    if (!response.ok) {
      let errorMessage = `Failed to book hotel (${response.status})`;
      try {
        const errorText = await response.text();
        let errorData = {};
        if (errorText) {
          try {
            errorData = JSON.parse(errorText);
          } catch (e) {
            console.error('Error parsing error response text:', errorText);
          }
        }
        console.error('API error details:', errorData);
        errorMessage = errorData.error || errorData.details || errorMessage;
      } catch (parseError) {
        console.error('Failed to parse error response:', parseError);
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('Booking success:', data);
    
    return data;
  } catch (error) {
    console.error('Booking error:', error);
    throw error;
  }
}

// Helper function to determine card type from card number
function getCardType(cardNumber) {
  // Simple regex patterns for common card types
  const patterns = {
    VISA: /^4[0-9]{12}(?:[0-9]{3})?$/,
    MASTERCARD: /^5[1-5][0-9]{14}$/,
    AMEX: /^3[47][0-9]{13}$/,
    DISCOVER: /^6(?:011|5[0-9]{2})[0-9]{12}$/,
  };

  for (const [type, pattern] of Object.entries(patterns)) {
    if (pattern.test(cardNumber)) {
      return type;
    }
  }
  
  return 'UNKNOWN';
}

export default {
  getCities,
  getAirports,
  getAirlines,
  searchFlights,
  bookFlights,
  retrieveBooking,
  searchLocations,
  searchRoundTripFlights,
  bookHotel
};
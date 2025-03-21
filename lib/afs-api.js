/**
 * Advanced Flights System (AFS) API client
 */

const API_KEY = process.env.AFS_API_KEY;
const BASE_URL = process.env.AFS_BASE_URL;

/**
 * Make a request to the AFS API
 * @param {string} endpoint - API endpoint
 * @param {string} method - HTTP method
 * @param {object} body - Request body for POST requests
 * @returns {Promise<any>} - API response
 */
async function makeRequest(endpoint, method = 'GET', body = null) {
  try {
    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY
    };

    const options = {
      method,
      headers
    };

    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AFS API error (${response.status}): ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('AFS API request failed:', error);
    throw error;
  }
}

export async function searchRoundTripFlights(origin, destination, departDate, returnDate) {
  const queryParams = new URLSearchParams({
    origin,
    destination,
    departDate,
    returnDate,
    tripType: 'round-trip'
  }).toString();
  
  return makeRequest(`/api/flights?${queryParams}`);
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
 * Search for flights
 * @param {string} origin - Origin city or airport code
 * @param {string} destination - Destination city or airport code
 * @param {string} date - Flight date in YYYY-MM-DD format
 * @returns {Promise<Object>} - Flight search results
 */
export async function searchFlights(origin, destination, date) {
  const queryParams = new URLSearchParams({
    origin,
    destination,
    date
  }).toString();
  
  return makeRequest(`/api/flights?${queryParams}`);
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

export default {
  getCities,
  getAirports,
  getAirlines,
  searchFlights,
  bookFlights,
  retrieveBooking,
  searchLocations,
  searchRoundTripFlights
};
/**
 * Advanced Flights System (AFS) API client
 */
require('dotenv').config();
import fetch from 'node-fetch';

const API_KEY = process.env.NEXT_PUBLIC_AFS_API_KEY;
const BASE_URL = process.env.NEXT_PUBLIC_AFS_BASE_URL;

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
  if (endpoint.startsWith('/api/proxy')) {
    // build absolute URL for proxy endpoints when on the server
    const base = typeof window === 'undefined'
      ? process.env.SITE_URL || 'http://localhost:3000'
      : '';
    url = `${base}${endpoint}`;
  } else {
    if (!BASE_URL) {
      throw new Error('BASE_URL is not defined. Check your .env file.');
    }
    url = `${BASE_URL}${endpoint}`;
  }
  
  let token;
  if (typeof localStorage !== 'undefined') {
    token = localStorage.getItem('authToken');
  } else {
    console.warn('localStorage is not available; using fallback token.');
    token = process.env.TOKEN || null;
  }

  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': API_KEY,
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  const options = {
    method,
    headers,
    timeout: 15000 // 15 seconds timeout
  };

  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
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
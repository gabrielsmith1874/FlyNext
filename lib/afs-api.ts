/**
 * Advanced Flights System (AFS) API client
 */
import { config } from 'dotenv';
import fetch from 'node-fetch';

config();

// Type definitions
interface City {
  id: string;
  name: string;
  code: string;
  country: string;
}

interface Airport {
  id: string;
  name: string;
  code: string;
  city: string;
  country: string;
}

interface Airline {
  id: string;
  name: string;
  code: string;
}

interface Flight {
  id: string;
  flightNumber: string;
  departureAirport: string;
  arrivalAirport: string;
  departureTime: string;
  arrivalTime: string;
  airline: string;
  price: number;
  currency: string;
  [key: string]: any; // For other flight properties
}

interface FlightSearchResponse {
  results?: Array<{
    flights?: Flight[] | Array<{flights: Flight[]}>
  }>;
}

interface RoundTripFlightResponse {
  outbound: Flight[];
  returnFlights: Flight[];
}

interface BookingData {
  flights: string[];
  passengers: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    [key: string]: any;
  }[];
  [key: string]: any;
}

interface BookingConfirmation {
  bookingReference: string;
  status: string;
  [key: string]: any;
}

interface HotelBookingData {
  hotelId: string;
  roomId: string;
  roomType?: string;
  checkInDate: string;
  checkOutDate: string;
  guestCount?: number;
  totalPrice?: number;
  currency?: string;
  guestDetails?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    [key: string]: any;
  };
  status?: string;
  bookingStatus?: string;
  addToCart?: boolean;
  skipConfirmation?: boolean;
}

interface Location {
  id: string;
  name: string;
  type: string;
  [key: string]: any;
}

const API_KEY = process.env.AFS_API_KEY || '0da1159fbf062d8e8b4650679aa39a7aefbcb6b3f6a455a0acc7345b8fb65a05';
const BASE_URL = process.env.AFS_BASE_URL || (process.env.DOCKER_ENV === 'true' ? 'http://afs-main:3001' : 'http://localhost:3001');

const fetchFn = typeof window === 'undefined'
  ? fetch
  : window.fetch;

/**
 * Make a request to the AFS API
 * @param endpoint - API endpoint
 * @param method - HTTP method
 * @param body - Request body for POST requests
 * @param retries - Number of retry attempts
 * @returns - API response
 */
async function makeRequest<T>(
  endpoint: string, 
  method: string = 'GET', 
  body: object | null = null, 
  retries: number = 3
): Promise<T> {
  let url: string;

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

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': API_KEY,
  };

  const options: RequestInit = {
    method,
    headers,
    // timeout: 15000, // Not directly supported in fetch type definition
  };

  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Making request to: ${url}`);
      const response = await fetchFn(url, options);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AFS API error (${response.status}): ${errorText}`);
      }
      return await response.json() as T;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Attempt ${attempt} failed:`, errorMessage);
      if (attempt === retries) {
        throw error;
      }
    }
  }
  
  // This should never be reached due to the throw in the loop
  throw new Error("Request failed after all retry attempts");
}

export async function searchRoundTripFlights(
  from: string, 
  to: string, 
  date: string, 
  returnDate: string
): Promise<RoundTripFlightResponse> {
    try {
      const outboundResponse = await searchFlights(from, to, date);
      const returnResponse = await searchFlights(to, from, returnDate);
      
      const outboundFlights = extractFlights(outboundResponse);
      const returnFlights = extractFlights(returnResponse);
      return {
        outbound: outboundFlights,
        returnFlights
      };
    } catch (error) {
      console.error('Error in searchRoundTripFlights:', error);
      return { outbound: [], returnFlights: [] };
    }
  }
  
  // Updated extraction logic
  function extractFlights(response: any): Flight[] {
    // New: if response is an array, return it directly
    if (Array.isArray(response)) {
      return response as Flight[];
    }
    try {
      if (!response.results || !Array.isArray(response.results)) {
        return [];
      }
      
      const flights: Flight[] = [];
      
      if (response.results.length > 0) {
        const firstResult = response.results[0];
        
        if (firstResult.flights && Array.isArray(firstResult.flights)) {
          
          firstResult.flights.forEach((flightItem: any) => {
            
            if (flightItem.id) {
              flights.push(flightItem as Flight);
            } else if (flightItem.flights && Array.isArray(flightItem.flights)) {
              flightItem.flights.forEach((flight: Flight) => {
                flights.push(flight);
              });
            } else if (typeof flightItem === 'object') {
              flights.push(flightItem as Flight);
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

/**
 * Get all cities from AFS
 * @returns - List of cities
 */
export async function getCities(): Promise<City[]> {
  return makeRequest<City[]>('/api/cities');
}

/**
 * Get all airports from AFS
 * @returns - List of airports
 */
export async function getAirports(): Promise<Airport[]> {
  return makeRequest<Airport[]>('/api/airports');
}

/**
 * Get all airlines from AFS
 * @returns - List of airlines
 */
export async function getAirlines(): Promise<Airline[]> {
  return makeRequest<Airline[]>('/api/airlines');
}

/**
 * Search for flights through the proxy endpoint
 * @param origin - Origin city or airport code
 * @param destination - Destination city or airport code
 * @param date - Flight date in YYYY-MM-DD format
 * @returns - Flight search results
 */
export async function searchFlights(
  origin: string, 
  destination: string, 
  date: string
): Promise<any> {
  const queryParams = new URLSearchParams({ origin, destination, date }).toString();
  return makeRequest(`/api/proxy/flights?${queryParams}`);
}

/**
 * Format a number as currency
 * @param amount - The amount to format
 * @param currency - Currency code (USD, EUR, etc)
 * @returns - Formatted currency string
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(amount);
}

/**
 * Book flights
 * @param bookingData - Booking data
 * @returns - Booking confirmation
 */
export async function bookFlights(bookingData: BookingData): Promise<BookingConfirmation> {
  return makeRequest<BookingConfirmation>('/api/bookings', 'POST', bookingData);
}

/**
 * Retrieve a booking
 * @param lastName - Passenger's last name
 * @param bookingReference - Booking reference
 * @returns - Booking details
 */
export async function retrieveBooking(
  lastName: string, 
  bookingReference: string
): Promise<BookingConfirmation> {
  const queryParams = new URLSearchParams({
    lastName,
    bookingReference
  }).toString();
  
  return makeRequest<BookingConfirmation>(`/api/bookings/retrieve?${queryParams}`);
}

export async function searchLocations(query: string, limit: number = 10): Promise<Location[]> {
  const queryParams = new URLSearchParams({
    query,
    limit: limit.toString()
  }).toString();
  
  return makeRequest<Location[]>(`/api/locations/search?${queryParams}`);
}

/**
 * Book a hotel room or add to cart
 * @param bookingData - Hotel booking data including hotelId, roomType, guestDetails, etc.
 * @returns - Booking reference or cart confirmation
 */
export async function bookHotel(bookingData: HotelBookingData): Promise<any> {
  try {
    console.log('Preparing hotel cart request:', bookingData);
    
    // Ensure required fields are present
    if (!bookingData.hotelId) throw new Error('Hotel ID is required');
    if (!bookingData.roomId) throw new Error('Room ID is required');
    if (!bookingData.checkInDate) throw new Error('Check-in date is required');
    if (!bookingData.checkOutDate) throw new Error('Check-out date is required');
    
    // Create a specific hotel booking request
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
      
      // Set status fields
      status: 'PENDING',
      bookingStatus: 'PENDING',
      addToCart: true,
      skipConfirmation: true
    };
    
    console.log('Sending hotel booking request:', requestData);
    
    // Get the auth token - try both possible storage keys
    if (typeof window === 'undefined') {
      throw new Error('Hotel booking requires browser environment');
    }
    
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
        let errorData: any = {};
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
function getCardType(cardNumber: string): string {
  // Simple regex patterns for common card types
  const patterns: Record<string, RegExp> = {
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
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { util } from 'zod';

/**
 * Merge tailwind classes with clsx
 * @param  {...any} inputs - Class names to merge
 * @returns {string} - Merged class names
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Format a date to YYYY-MM-DD
 * @param {Date} date - Date object
 * @returns {string} - Formatted date
 */
export function formatDate(date) {
  return date.toISOString().split('T')[0];
}

/**
 * Format a price with currency
 * @param {number} price - Price
 * @param {string} currency - Currency code
 * @returns {string} - Formatted price
 */
export function formatPrice(price, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(price);
}

/**
 * Alias for formatPrice - maintains compatibility with components using formatCurrency
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code
 * @returns {string} - Formatted currency string
 */
export function formatCurrency(amount, currency = 'USD') {
  return formatPrice(amount, currency);
}

/**
 * Format flight duration in minutes to hours and minutes
 * @param {number} minutes - Duration in minutes
 * @returns {string} - Formatted duration
 */
export function formatDuration(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

/**
 * Generate a random booking reference
 * @returns {string} - Booking reference
 */
export function generateBookingReference() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate a random ticket number
 * @returns {string} - Ticket number
 */
export function generateTicketNumber() {
  return Math.random().toString(36).substring(2, 12);
}

/**
 * Calculate the total price of flights
 * @param {Array} flights - List of flights
 * @returns {number} - Total price
 */
export function calculateTotalPrice(flights) {
  return flights.reduce((total, flight) => total + flight.price, 0);
}

/**
 * Uploads an image file to the server and returns the URL
 * @param {File} file - The image file to upload
 * @returns {Promise<string>} - The URL of the uploaded image
 */
export async function uploadImage(file) {
  console.log('Starting image upload for file:', file.name);
  
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    console.log('Form data created with file');
    
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`Upload failed with status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Upload successful, received data:', data);
    
    return data.url;
  } catch (error) {
    console.error('Error in uploadImage function:', error);
    throw error;
  }
}

/**
 * Calculate the connection time between two flights
 * @param {Object} departingFlight - The departing flight
 * @param {Object} arrivingFlight - The arriving flight
 * @returns {string} - Formatted connection time
 */
export function calculateConnectionTime(departingFlight, arrivingFlight) {
  if (!departingFlight.arrivalTime || !arrivingFlight.departureTime) {
    return 'Unknown';
  }
  
  const arrivalTime = new Date(departingFlight.arrivalTime).getTime();
  const departureTime = new Date(arrivingFlight.departureTime).getTime();
  
  const diffMs = departureTime - arrivalTime;
  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  return `${diffHrs}h ${diffMins}m`;
}

export default {
  cn,
  formatDate,
  formatPrice,
  formatDuration,
  generateBookingReference,
  generateTicketNumber,
  calculateTotalPrice,
  uploadImage,
  calculateConnectionTime,
};
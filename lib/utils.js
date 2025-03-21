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

export default {
  formatDate,
  formatPrice,
  formatDuration,
  generateBookingReference,
  generateTicketNumber,
  calculateTotalPrice
};
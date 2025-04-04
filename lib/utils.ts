import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind classes with clsx
 * @param inputs - Class names to merge
 * @returns Merged class names
 */
export function cn(...inputs: (string | undefined | null | boolean)[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Format a date to YYYY-MM-DD
 * @param date - Date object
 * @returns Formatted date
 */
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Format a price with currency
 * @param price - Price
 * @param currency - Currency code
 * @returns Formatted price
 */
export function formatPrice(price: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(price);
}

/**
 * Alias for formatPrice - maintains compatibility with components using formatCurrency
 * @param amount - Amount to format
 * @param currency - Currency code
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return formatPrice(amount, currency);
}

/**
 * Format flight duration in minutes to hours and minutes
 * @param minutes - Duration in minutes
 * @returns Formatted duration
 */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

/**
 * Generate a random booking reference
 * @returns Booking reference
 */
export function generateBookingReference(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate a random ticket number
 * @returns Ticket number
 */
export function generateTicketNumber(): string {
  return Math.random().toString(36).substring(2, 12);
}

/**
 * Calculate the total price of flights
 * @param flights - List of flights
 * @returns Total price
 */
export function calculateTotalPrice(flights: { price: number }[]): number {
  return flights.reduce((total, flight) => total + flight.price, 0);
}

/**
 * Uploads an image file to the server and returns the URL
 * @param file - The image file to upload
 * @returns The URL of the uploaded image
 */
export async function uploadImage(file: File): Promise<string> {
  console.log('Starting image upload for file:', file.name);

  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Upload failed with status: ${response.status}`);
  }

  const data = await response.json();
  return data.url;
}

/**
 * Calculate the connection time between two flights
 * @param departingFlight - The departing flight
 * @param arrivingFlight - The arriving flight
 * @returns Formatted connection time
 */
export function calculateConnectionTime(
  departingFlight: { arrivalTime: string },
  arrivingFlight: { departureTime: string }
): string {
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
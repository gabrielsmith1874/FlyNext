interface GuestDetails {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  [key: string]: any;
}

/**
 * Save hotel guest details to localStorage
 * @param guestDetails - Guest details to save
 */
export function saveHotelGuestDetails(guestDetails: GuestDetails): void {
  try {
    localStorage.setItem('hotelGuestDetails', JSON.stringify(guestDetails));
    console.log('Hotel guest details saved to localStorage:', guestDetails);
  } catch (e) {
    console.error('Failed to save hotel guest details to localStorage:', e);
  }
}

/**
 * Retrieve hotel guest details from localStorage
 * @returns The parsed guest details or null if not found
 */
export function getHotelGuestDetails(): GuestDetails | null {
  try {
    const details = localStorage.getItem('hotelGuestDetails');
    return details ? JSON.parse(details) : null;
  } catch (e) {
    console.error('Failed to retrieve hotel guest details from localStorage:', e);
    return null;
  }
}
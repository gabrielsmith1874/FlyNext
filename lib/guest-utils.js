/**
 * Save hotel guest details to localStorage
 * @param {Object} guestDetails - Guest details to save
 */
export function saveHotelGuestDetails(guestDetails) {
  try {
    localStorage.setItem('hotelGuestDetails', JSON.stringify(guestDetails));
    console.log('Hotel guest details saved to localStorage:', guestDetails);
  } catch (e) {
    console.error('Failed to save hotel guest details to localStorage:', e);
  }
}

/**
 * Retrieve hotel guest details from localStorage
 * @returns {Object|null} The parsed guest details or null if not found
 */
export function getHotelGuestDetails() {
  try {
    const details = localStorage.getItem('hotelGuestDetails');
    return details ? JSON.parse(details) : null;
  } catch (e) {
    console.error('Failed to retrieve hotel guest details from localStorage:', e);
    return null;
  }
}

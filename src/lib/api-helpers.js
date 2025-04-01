/**
 * Helper function to make authenticated API requests
 * @param {string} url - API endpoint
 * @param {Object} options - Request options
 * @returns {Promise<Response>}
 */
export async function fetchWithAuth(url, options = {}) {
  // Get the token from local storage or sessionStorage
  let token;
  
  // Try to get token from different storage locations
  if (typeof window !== 'undefined') {
    token = localStorage.getItem('token') || 
            sessionStorage.getItem('token') || 
            localStorage.getItem('authToken') || 
            sessionStorage.getItem('authToken');
  }
  
  console.log(`Making authenticated request to ${url}`);
  console.log(`Token available: ${!!token}`);
  
  // Merge headers, ensure Authorization header is set
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };
  
  // Return the fetch with proper auth headers
  return fetch(url, {
    ...options,
    headers
  });
}

/**
 * Delete a booking component
 * @param {string} bookingId - The booking ID
 * @param {string} componentType - 'flight' or 'hotel'
 * @param {string} componentId - The component ID to delete
 * @returns {Promise<Object>} - Response data
 */
export async function deleteBookingComponent(bookingId, componentType, componentId) {
  // Validate inputs
  if (!bookingId) throw new Error('Booking ID is required');
  if (!componentType) throw new Error('Component type is required');
  if (!componentId) throw new Error('Component ID is required');
  
  if (!['flight', 'hotel'].includes(componentType)) {
    throw new Error('Component type must be either "flight" or "hotel"');
  }
  
  console.log(`Deleting ${componentType} (${componentId}) from booking ${bookingId}`);
  
  try {
    const response = await fetchWithAuth(
      `/api/bookings/${bookingId}/component`,
      {
        method: 'DELETE',
        body: JSON.stringify({ componentType, componentId }),
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Component deletion error response:', data);
      throw new Error(data.details || data.error || 'Failed to delete component');
    }
    
    return data;
  } catch (error) {
    console.error('Error in deleteBookingComponent:', error);
    // Re-throw client-side errors
    throw error;
  }
}

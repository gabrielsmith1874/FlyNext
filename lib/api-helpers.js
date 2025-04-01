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
  console.log(`Deleting ${componentType} (${componentId}) from booking ${bookingId}`);
  
  const response = await fetchWithAuth(
    `/api/bookings/${bookingId}/component`,
    {
      method: 'DELETE',      body: JSON.stringify({ componentType, componentId })
    }
  );
  
  if (!response.ok) {
    const errorData = await response.json();
    console.error('Component deletion error response:', errorData);
    throw new Error(errorData.details || errorData.error || 'Failed to delete component');
  }
  
  return response.json();
}

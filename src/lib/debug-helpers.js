/**
 * Debug helpers for development environment
 */

/**
 * Enhanced console logging for development
 * @param {string} context - Context label for the log
 * @param {any} data - Data to log
 */
export function devLog(context, data) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[${context}]`, data);
  }
}

/**
 * Debug API requests
 * @param {string} method - HTTP method
 * @param {string} url - API endpoint
 * @param {Object} options - Request options
 */
export async function debugApiRequest(method, url, options = {}) {
  if (process.env.NODE_ENV !== 'development') return;
  
  const requestId = Math.random().toString(36).substring(2, 9);
  
  console.group(`API Request #${requestId}: ${method} ${url}`);
  console.log('Headers:', options.headers || 'None');
  console.log('Body:', options.body ? JSON.parse(options.body) : 'None');
  console.groupEnd();
  
  return requestId;
}

/**
 * Debug API responses
 * @param {string} requestId - Request ID from debugApiRequest
 * @param {Response} response - Fetch Response object
 */
export async function debugApiResponse(requestId, response) {
  if (process.env.NODE_ENV !== 'development') return;
  
  const clone = response.clone();
  let responseBody;
  try {
    responseBody = await clone.json();
  } catch (e) {
    responseBody = 'Not JSON';
  }
  
  console.group(`API Response #${requestId}: ${response.status} ${response.statusText}`);
  console.log('Headers:', Object.fromEntries([...response.headers]));
  console.log('Body:', responseBody);
  console.groupEnd();
}

/**
 * Auth helper functions for client-side use
 */

/**
 * Saves the authentication token to storage
 * @param token - JWT token
 * @param rememberMe - Whether to use localStorage (true) or sessionStorage (false)
 */
export function saveToken(token: string, rememberMe: boolean = true): void {
    if (typeof window === 'undefined') return;
  
    const storage = rememberMe ? localStorage : sessionStorage;
  
    // Store in multiple locations for compatibility with different parts of the app
    storage.setItem('token', token);
    storage.setItem('authToken', token);
  
    console.log('Token saved to ' + (rememberMe ? 'localStorage' : 'sessionStorage'));
  }
  
  /**
   * Retrieves the authentication token
   * @returns The stored token or null
   */
  export function getToken(): string | null {
    if (typeof window === 'undefined') return null;
  
    // Try different storage locations and keys
    return (
      localStorage.getItem('token') ||
      sessionStorage.getItem('token') ||
      localStorage.getItem('authToken') ||
      sessionStorage.getItem('authToken')
    );
  }
  
  /**
   * Checks if the user is logged in by verifying token existence
   * @returns True if the user is logged in, false otherwise
   */
  export function isLoggedIn(): boolean {
    return !!getToken();
  }
  
  /**
   * Logs out the user by removing stored tokens
   */
  export function logout(): void {
    if (typeof window === 'undefined') return;
  
    // Clear from all possible storage locations
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('authToken');
  
    console.log('User logged out');
  }
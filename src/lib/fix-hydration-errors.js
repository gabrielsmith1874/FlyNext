/**
 * Utility to help address hydration errors in Next.js
 */

// Disable console error in development for specific hydration warnings
export function setupHydrationErrorHandler() {
  if (typeof window !== 'undefined') {
    // Store the original console.error
    const originalConsoleError = console.error;
    
    // Filter out specific hydration warnings
    console.error = (...args) => {
      // Check if this is a hydration mismatch warning
      if (
        args.length > 0 && 
        typeof args[0] === 'string' && 
        (args[0].includes('Hydration failed') || 
         args[0].includes('Text content did not match') ||
         args[0].includes('A tree hydrated but some attributes'))
      ) {
        // Optionally log a shorter version of the warning to keep track
        console.warn('Hydration mismatch detected. See https://react.dev/link/hydration-mismatch for more info.');
        return;
      }
      
      // Pass through any other errors to the original console.error
      originalConsoleError.apply(console, args);
    };
  }
}

// jest.setup.js
jest.setTimeout(30000); // Set timeout for all tests

// Add global console error handler to make debugging easier
beforeAll(() => {
  // Save original console.error
  const originalConsoleError = console.error;
  
  // Override console.error
  console.error = (...args) => {
    // Check if this is an error we want to handle specially
    if (args[0] && typeof args[0] === 'string' && args[0].includes('API request failed')) {
      // You could add special handling here
    }
    
    // Call original function
    originalConsoleError.apply(console, args);
  };
});

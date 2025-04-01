'use client';

import { useEffect } from 'react';
import { setupHydrationErrorHandler } from '@/lib/fix-hydration-errors';

export function Providers({ children }) {
  useEffect(() => {
    // Set up the error handler in development
    if (process.env.NODE_ENV === 'development') {
      setupHydrationErrorHandler();
    }
  }, []);

  return children;
}

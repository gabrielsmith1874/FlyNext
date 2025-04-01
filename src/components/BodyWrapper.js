'use client';

import { useEffect, useState } from 'react';

/**
 * This component handles body hydration mismatches by applying the classes
 * only after client-side hydration is complete.
 */
export default function BodyWrapper({ children, className }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <body 
      className={className}
      suppressHydrationWarning={true}
    >
      {children}
    </body>
  );
}

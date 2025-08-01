'use client';

import { useEffect, useState, ReactNode } from 'react';

// This is a special component that only renders its children on the client
// It's crucial for components that need to access browser APIs or have hydration issues
export default function ClientOnly({ children }: { children: ReactNode }) {
  // Start with not mounted state
  const [hasMounted, setHasMounted] = useState(false);

  // After hydration, mark as mounted
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Don't render anything on the server or during hydration
  if (!hasMounted) {
    return null;
  }

  // Once mounted on client, render children
  return <>{children}</>;
}

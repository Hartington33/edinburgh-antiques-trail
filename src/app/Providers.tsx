'use client';

import { ReactNode } from 'react';
import { MapProvider } from '@/contexts/MapContext';

interface ProvidersProps {
  children: ReactNode;
}

// Component to wrap the app with all context providers
export default function Providers({ children }: ProvidersProps) {
  return (
    <MapProvider>
      {children}
    </MapProvider>
  );
}

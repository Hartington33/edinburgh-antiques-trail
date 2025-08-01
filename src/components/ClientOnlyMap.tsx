'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Define the map style to share across components
export const mapStyle = {
  width: '100%',
  height: '400px',
  borderRadius: '0.5rem',
};

// Create a client-only version of the map component that works offline
// Only load Google Maps on the client side
export default function ClientOnlyMap({ 
  lat, 
  lng, 
  zoom = 15
}: { 
  lat: number; 
  lng: number;
  zoom?: number;
}) {
  // Track map loading state
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  // Dynamic import Google Maps components
  const GoogleMapComponent = dynamic(
    () => import('@react-google-maps/api').then(mod => {
      const { GoogleMap, LoadScript, Marker } = mod;
      return function MapWrapper(props: any) {
        return (
          <LoadScript 
            googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}
            onLoad={() => setIsMapLoaded(true)}
            onError={() => {
              console.error('Failed to load Google Maps');
              setIsMapLoaded(false);
            }}
          >
            <GoogleMap
              mapContainerStyle={mapStyle}
              center={{ lat, lng }}
              zoom={zoom}
              options={{
                streetViewControl: false,
                mapTypeControl: false
              }}
            >
              <Marker position={{ lat, lng }} />
            </GoogleMap>
          </LoadScript>
        );
      };
    }),
    { 
      ssr: false,
      loading: () => (
        <div style={{
          ...mapStyle,
          backgroundColor: '#f0f0f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div>Loading map...</div>
        </div>
      )
    }
  );

  // Check online status on mount
  useEffect(() => {
    setIsOnline(navigator.onLine);
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // If offline, show a simple placeholder
  if (!isOnline) {
    return (
      <div style={{
        ...mapStyle,
        backgroundColor: '#f0f0f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column'
      }}>
        <div style={{ marginBottom: '12px' }}>You're currently offline</div>
        <div>Map unavailable</div>
      </div>
    );
  }

  // Render the dynamically loaded map
  return <GoogleMapComponent />;
}

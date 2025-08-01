'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Map container styles
const mapContainerStyle = {
  width: '100%',
  height: '400px',
  borderRadius: '0.5rem',
};

// Interface for props
interface EditorMapProps {
  lat: number;
  lng: number;
  onChange: (position: { lat: number; lng: number }) => void;
}

// Create a client-only map component specifically for the editor
// This ensures that the map only loads on the client-side and after hydration
function EditorMap({ lat, lng, onChange }: EditorMapProps) {
  // Create state for position
  const [position, setPosition] = useState({ lat, lng });
  
  // Update position when props change (rare case but handles it)
  useEffect(() => {
    setPosition({ lat, lng });
  }, [lat, lng]);

  // Handle position changes and propagate to parent
  const handlePositionChange = (newPosition: { lat: number; lng: number }) => {
    setPosition(newPosition);
    onChange(newPosition);
  };

  // Dynamically import Google Maps components with strict client-side only rendering
  const MapComponent = dynamic(
    () => import('@react-google-maps/api').then(mod => {
      const { GoogleMap, LoadScript, Marker } = mod;
      
      // Return a wrapped component to handle the map logic
      return function MapWrapper() {
        return (
          <LoadScript 
            googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}
            loadingElement={
              <div style={{
                ...mapContainerStyle,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f0f0f0'
              }}>
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-edinburgh-blue"></div>
              </div>
            }
          >
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={position}
              zoom={13}
              options={{
                streetViewControl: false,
                mapTypeControl: false,
                fullscreenControl: false
              }}
              onClick={(e) => {
                if (e.latLng) {
                  const newPosition = {
                    lat: e.latLng.lat(),
                    lng: e.latLng.lng()
                  };
                  handlePositionChange(newPosition);
                }
              }}
            >
              <Marker 
                position={position} 
                draggable={true}
                onDragEnd={(e) => {
                  if (e.latLng) {
                    const newPosition = {
                      lat: e.latLng.lat(),
                      lng: e.latLng.lng()
                    };
                    handlePositionChange(newPosition);
                  }
                }}
              />
            </GoogleMap>
          </LoadScript>
        );
      };
    }),
    { 
      ssr: false, // Critical: ensure this component never tries to render on the server
      loading: () => (
        <div style={{
          ...mapContainerStyle,
          backgroundColor: '#f0f0f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-edinburgh-blue"></div>
        </div>
      )
    }
  );

  return <MapComponent />;
}

export default EditorMap;

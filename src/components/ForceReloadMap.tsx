'use client';

import { useEffect, useRef, useState } from 'react';

interface ForceReloadMapProps {
  lat: number;
  lng: number;
  onChange: (position: { lat: number; lng: number }) => void;
}

export default function ForceReloadMap({ lat, lng, onChange }: ForceReloadMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [key, setKey] = useState(Date.now()); // Force re-render key
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  
  // Retry loading if map fails to initialize
  useEffect(() => {
    if (retryCount > 0 && retryCount <= maxRetries && !isMapLoaded) {
      const retryTimer = setTimeout(() => {
        console.log(`Retrying map load attempt ${retryCount} of ${maxRetries}`);
        setKey(Date.now()); // Force component to remount and try again
      }, 500 * retryCount); // Increase delay with each retry
      
      return () => clearTimeout(retryTimer);
    }
  }, [retryCount, isMapLoaded, maxRetries]);

  useEffect(() => {
    // Guarantee we're on the client side
    if (typeof window === 'undefined') return;
    
    // Force a component remount after a short delay
    // This ensures the map renders fresh after navigation
    const timer = setTimeout(() => {
      setKey(Date.now());
    }, 200);
    
    return () => clearTimeout(timer);
  }, []);
  
  useEffect(() => {
    if (!mapContainerRef.current) return;
    
    let googleMap: any = null;
    let marker: any = null;
    
    // Load the Google Maps script dynamically
    const loadGoogleMaps = () => {
      // If already loaded, initialize map directly
      if (window.google && window.google.maps) {
        initMap();
        return;
      }
      
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
      
      // Create a unique callback name
      const callbackName = `initMap${Date.now()}`;
      
      // Setup the callback
      window[callbackName] = () => {
        initMap();
        delete window[callbackName];
      };
      
      // Create and append the script
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=${callbackName}`;
      script.defer = true;
      script.async = true;
      document.head.appendChild(script);
      
      return () => {
        // Clean up the callback
        if (window[callbackName]) {
          delete window[callbackName];
        }
        
        // Clean up the script if it exists
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
      };
    };
    
    // Initialize the map
    const initMap = () => {
      if (!mapContainerRef.current || !window.google || !window.google.maps) {
        // If map can't initialize, increment retry count
        if (retryCount < maxRetries) {
          setRetryCount(prev => prev + 1);
          console.log(`Map initialization failed, scheduling retry ${retryCount + 1} of ${maxRetries}`);
        }
        return false;
      }
      
      try {
        // Create the map
        googleMap = new window.google.maps.Map(mapContainerRef.current, {
          center: { lat, lng },
          zoom: 13,
          mapTypeControl: false,
          fullscreenControl: false,
          streetViewControl: false,
        });
        
        // Create the marker
        marker = new window.google.maps.Marker({
          position: { lat, lng },
          map: googleMap,
          draggable: true
        });
        
        // Add click listener
        googleMap.addListener('click', (e: any) => {
          if (e.latLng) {
            const newPosition = {
              lat: e.latLng.lat(),
              lng: e.latLng.lng()
            };
            marker.setPosition(newPosition);
            onChange(newPosition);
          }
        });
        
        // Add drag listener
        marker.addListener('dragend', () => {
          const position = marker.getPosition();
          if (position) {
            const newPosition = {
              lat: position.lat(),
              lng: position.lng()
            };
            onChange(newPosition);
          }
        });
        
        setIsMapLoaded(true);
        // Reset retry count on success
        setRetryCount(0);
        return true;
      } catch (error) {
        console.error('Error initializing map:', error);
        // Increment retry counter if map initialization failed
        if (retryCount < maxRetries) {
          setRetryCount(prev => prev + 1);
          console.log(`Map initialization error, scheduling retry ${retryCount + 1} of ${maxRetries}`);
        }
        return false;
      }
    };
    
    // Start loading the map
    const cleanup = loadGoogleMaps();
    
    // Clean up on unmount
    return () => {
      if (cleanup) cleanup();
      
      // Clean up map listeners
      if (marker && window.google) {
        window.google.maps.event.clearInstanceListeners(marker);
      }
      if (googleMap && window.google) {
        window.google.maps.event.clearInstanceListeners(googleMap);
      }
    };
  }, [lat, lng, onChange, key]); // Include key to force re-run on remount
  
  return (
    <div className="relative w-full h-[400px] rounded-lg bg-gray-100">
      <div 
        ref={mapContainerRef} 
        className="w-full h-full rounded-lg"
      />
      {!isMapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-edinburgh-blue"></div>
        </div>
      )}
    </div>
  );
}

// Add a TypeScript declaration for Google Maps
declare global {
  interface Window {
    google?: any;
    [key: string]: any;
  }
}

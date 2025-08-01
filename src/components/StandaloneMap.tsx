'use client';

import { useEffect, useRef } from 'react';

interface StandaloneMapProps {
  lat: number;
  lng: number;
  onChange: (position: { lat: number; lng: number }) => void;
}

export default function StandaloneMap({ lat, lng, onChange }: StandaloneMapProps) {
  // Refs for DOM elements and map objects
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const loadingTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Use a brute-force approach to ensure the map loads
  useEffect(() => {
    let scriptAdded = false;
    let scriptLoaded = false;
    let mapInitialized = false;
    let mapInitAttempts = 0;
    const MAX_ATTEMPTS = 5;

    // Function to initialize the map
    const initMap = () => {
      if (!mapContainerRef.current || mapInitialized || !window.google || !window.google.maps) {
        return false;
      }
      
      try {
        // Create the map
        const mapOptions = {
          center: { lat, lng },
          zoom: 13,
          mapTypeControl: false,
          fullscreenControl: false,
          streetViewControl: false,
        };

        const map = new window.google.maps.Map(mapContainerRef.current, mapOptions);
        
        // Create the marker
        const marker = new window.google.maps.Marker({
          position: { lat, lng },
          map,
          draggable: true
        });
        
        // Set up event listeners
        map.addListener('click', (e: any) => {
          const position = {
            lat: e.latLng.lat(),
            lng: e.latLng.lng()
          };
          marker.setPosition(position);
          onChange(position);
        });
        
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
        
        // Store references
        mapRef.current = map;
        markerRef.current = marker;
        mapInitialized = true;
        
        // Clear any loading indicators
        if (loadingTimerRef.current) {
          clearTimeout(loadingTimerRef.current);
          loadingTimerRef.current = null;
        }
        
        return true;
      } catch (error) {
        console.error('Error initializing map:', error);
        return false;
      }
    };
    
    // Function to load the Google Maps API script
    const loadGoogleMapsScript = () => {
      if (scriptAdded) return;
      
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
      const callbackName = `initGoogleMap${Date.now()}`;
      
      // Store the callback name to allow cleanup later
      (window as any).__mapCallbackName = callbackName;
      
      // Create global callback
      window[callbackName] = () => {
        scriptLoaded = true;
        delete window[callbackName];
        // Try initializing the map immediately
        initMap();
        
        // Also try again after a short delay (helps with race conditions)
        setTimeout(() => {
          if (!mapInitialized) initMap();
        }, 100);
      };
      
      // Create and append script
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=${callbackName}`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
      
      scriptAdded = true;
    };
    
    // First, try to initialize if Google Maps is already loaded
    const tryInitialize = () => {
      if (window.google && window.google.maps) {
        const success = initMap();
        if (success) return;
      }
      
      // If not loaded or init failed, and script not yet added, add it
      if (!scriptAdded) {
        loadGoogleMapsScript();
      } 
      // If script was added but map not initialized yet, try again (up to MAX_ATTEMPTS)
      else if (scriptLoaded && !mapInitialized && mapInitAttempts < MAX_ATTEMPTS) {
        mapInitAttempts++;
        setTimeout(tryInitialize, 200 * mapInitAttempts); // Exponential backoff
      }
    };
    
    // Set a loading indicator timer
    loadingTimerRef.current = setTimeout(() => {
      // If map still not initialized after 2 seconds, retry script loading
      if (!mapInitialized) {
        tryInitialize();
      }
    }, 2000);
    
    // Start the initialization process
    tryInitialize();
    
    // Cleanup function
    return () => {
      // Clear the loading timer
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
      }
      
      // Cleanup map and listeners if they were created
      if (mapRef.current && markerRef.current) {
        google.maps.event.clearInstanceListeners(markerRef.current);
        google.maps.event.clearInstanceListeners(mapRef.current);
        markerRef.current.setMap(null);
        mapRef.current = null;
        markerRef.current = null;
      }
      
      // Remove callback if it still exists
      if ((window as any).__mapCallbackName) {
        delete window[(window as any).__mapCallbackName];
        delete (window as any).__mapCallbackName;
      }
    };
  }, []); // Empty dependency array - we handle position updates manually
  
  // Update marker position when lat/lng props change
  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.setPosition({ lat, lng });
    }
  }, [lat, lng]);

  return (
    <div className="relative">
      <div 
        ref={mapContainerRef} 
        style={{ 
          width: '100%', 
          height: '400px', 
          borderRadius: '0.5rem',
          backgroundColor: '#f0f0f0'
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-edinburgh-blue"></div>
        </div>
      </div>
    </div>
  );
}

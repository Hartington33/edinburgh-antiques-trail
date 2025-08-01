'use client';

import { useState, useEffect, useRef } from 'react';

// Global variable to track if Maps API is loading
let isApiLoading = false;
let googleMapsPromise = null;

// Small map component for place detail pages
export default function SmallMap({ lat, lng, zoom = 15, places = [] }) {
  const mapRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  
  // Safe load Google Maps API
  useEffect(() => {
    // Create a function to load the API once
    const loadGoogleMapsApi = () => {
      // If API is already loaded, use it
      if (window.google && window.google.maps) {
        setIsLoaded(true);
        return Promise.resolve();
      }
      
      // If already loading, return the existing promise
      if (isApiLoading && googleMapsPromise) {
        googleMapsPromise.then(() => setIsLoaded(true)).catch(() => setLoadError(true));
        return googleMapsPromise;
      }
      
      // Start new load process
      isApiLoading = true;
      const callbackName = 'googleMapsCallback' + Date.now();
      
      // Create a promise to track loading
      googleMapsPromise = new Promise((resolve, reject) => {
        // Add callback to window
        window[callbackName] = () => {
          isApiLoading = false;
          delete window[callbackName];
          resolve();
        };
        
        // Create script element
        const script = document.createElement('script');
        // Use environment variable for API key
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=${callbackName}`;
        script.async = true;
        script.defer = true;
        
        // Handle load error
        script.onerror = () => {
          isApiLoading = false;
          delete window[callbackName];
          reject(new Error('Failed to load Google Maps API'));
        };
        
        // Add to document
        document.head.appendChild(script);
      });
      
      // Handle the promise results
      googleMapsPromise
        .then(() => {
          setIsLoaded(true);
        })
        .catch((error) => {
          console.error('Error loading Google Maps:', error);
          setLoadError(true);
        });
      
      return googleMapsPromise;
    };
    
    // Call the function to load the API
    loadGoogleMapsApi();
    
    // No need for cleanup as we're managing the global state
  }, []);
  
  // Initialize map when API is loaded
  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;
    
    let map;
    try {
      // Create map instance
      map = new window.google.maps.Map(mapRef.current, {
      center: { lat, lng },
      zoom,
      mapTypeControl: false,
      fullscreenControl: false,
      streetViewControl: false,
      zoomControl: true,
      zoomControlOptions: {
        position: window.google.maps.ControlPosition.RIGHT_TOP
      }
    });
    
    // Define the same type colors used in other maps
    const typeColors = {
      1: '#FF4136', // Antique Shop (Red)
      2: '#0074D9', // Auction House (Blue)
      3: '#2ECC40', // Book Shop (Green)
      4: '#B10DC9', // Record Shop (Purple)
      5: '#FFDC00', // Vintage Clothing (Yellow)
      6: '#FF851B', // Antique Fair (Orange)
      7: '#8B4513', // Furniture (Brown)
      8: '#444444', // Charity Shop (Dark Grey)
    };

    // Create colored circle SVG marker
    const getMarkerIcon = (typeId) => {
      // Get color or fallback to grey
      const color = typeColors[typeId] || '#AAAAAA';
      
      // Create SVG marker as a data URL
      const svgMarker = encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" fill="${color}" stroke="white" stroke-width="2"/>
        </svg>
      `);
      
      return `data:image/svg+xml;charset=UTF-8,${svgMarker}`;
    };

    // Create markers for all places
    const markers = places.map(place => {
      if (!place.lat || !place.lng) return null;
      
      return new window.google.maps.Marker({
        position: { lat: place.lat, lng: place.lng },
        map,
        title: place.name,
        icon: {
          url: getMarkerIcon(place.type_id),
          scaledSize: new window.google.maps.Size(30, 30)
        }
      });
    }).filter(Boolean);
    
    // Cleanup function
    return () => {
      if (markers) {
        markers.forEach(marker => marker && marker.setMap(null));
      }
    };
    } catch (error) {
      console.error('Error initializing map:', error);
      setLoadError(true);
    }
  }, [isLoaded, lat, lng, zoom, places]);
  
  // Show error state
  if (loadError) {
    return (
      <div className="bg-gray-100 rounded-lg p-4 text-center">
        <p>Unable to load map</p>
      </div>
    );
  }
  
  // Show loading state
  if (!isLoaded) {
    return (
      <div className="bg-gray-100 rounded-lg flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-edinburgh-blue"></div>
      </div>
    );
  }
  
  // Render map
  return (
    <div className="w-full h-64 rounded-lg overflow-hidden">
      <div ref={mapRef} className="w-full h-full"></div>
    </div>
  );
}

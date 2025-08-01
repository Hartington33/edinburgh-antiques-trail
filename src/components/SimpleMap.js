'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * A simplified map component that works reliably client-side
 * This avoids issues with dynamic imports and server-side rendering
 */
export default function SimpleMap({ lat, lng, zoom = 15, places = [] }) {
  // Create a unique key that changes when the component is mounted
  // This ensures a complete remount when navigating back to the page
  const [uniqueKey] = useState(Date.now().toString());
  const [isLoaded, setIsLoaded] = useState(false);
  const [map, setMap] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [infoWindow, setInfoWindow] = useState(null);
  const router = useRouter();
  
  // Function to load Google Maps API
  const loadGoogleMapsApi = () => {
    return new Promise((resolve, reject) => {
      // If already loaded, resolve immediately
      if (window.google && window.google.maps) {
        resolve();
        return;
      }
      
      // Create script element
      const script = document.createElement('script');
      const callbackName = 'googleMapsInitialize' + uniqueKey.replace(/\D/g, '');
      
      // Set up callback function
      window[callbackName] = () => {
        resolve();
        // Clean up global callback after use
        delete window[callbackName];
      };
      
      // Configure script
      script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyAQ0N-wuHgiYSgdufORprdn2H1GoGJ-vdY&callback=${callbackName}`;
      script.async = true;
      script.defer = true;
      
      // Handle errors
      script.onerror = () => {
        reject(new Error('Failed to load Google Maps API'));
        delete window[callbackName];
      };
      
      // Add to document
      document.head.appendChild(script);
    });
  };

  // Main initialization effect
  useEffect(() => {
    // Skip on server-side
    if (typeof window === 'undefined') return;
    
    let isMounted = true;
    let mapInstance = null;
    let infoWindowInstance = null;
    let mapMarkers = [];
    
    // Main initialization function
    const initializeMap = async () => {
      try {
        // Load Google Maps API if needed
        await loadGoogleMapsApi();
        
        if (!isMounted) return;
        
        // Find map container
        const mapContainer = document.getElementById('map');
        if (!mapContainer) {
          console.error('Map container not found');
          return;
        }
        
        // Create new map instance
        mapInstance = new window.google.maps.Map(mapContainer, {
          center: { lat, lng },
          zoom,
          mapTypeControl: false,
          fullscreenControl: false,
          streetViewControl: false,
        });
        
        // Create info window instance
        infoWindowInstance = new window.google.maps.InfoWindow();
        
        // Update state
        setMap(mapInstance);
        setInfoWindow(infoWindowInstance);
        setIsLoaded(true);
        
        // Add markers
        if (places && places.length > 0) {
          addMarkers(mapInstance, infoWindowInstance, places);
        }
      } catch (error) {
        console.error('Error initializing map:', error);
      }
    };
    
    // Function to add markers to the map
    const addMarkers = (mapObj, infoWindowObj, placesArray) => {
      // Clear existing markers
      mapMarkers.forEach(marker => marker.setMap(null));
      mapMarkers = [];
      
      // Create bounds object to fit all markers
      const bounds = new window.google.maps.LatLngBounds();
      let hasValidMarkers = false;
      
      // Add new markers
      placesArray.forEach(place => {
        if (!place.lat || !place.lng) return;
        
        const position = { lat: place.lat, lng: place.lng };
        const marker = new window.google.maps.Marker({
          position,
          map: mapObj,
          title: place.name,
        });
        
        // Extend bounds to include this marker
        bounds.extend(position);
        hasValidMarkers = true;
        
        // Add click listener
        marker.addListener('click', () => {
          // Set info window content
          infoWindowObj.setContent(`
            <div style="max-width: 200px;">
              <h3 style="margin-top: 0; font-weight: bold;">${place.name}</h3>
              <p>${place.address || ''}</p>
              ${place.type_name ? `<p><small>${place.type_name}</small></p>` : ''}
              <a href="/places/${place.id}" style="color: #003366;">View Details</a>
            </div>
          `);
          
          // Open info window
          infoWindowObj.open({
            anchor: marker,
            map: mapObj,
          });
        });
        
        // Store marker reference
        mapMarkers.push(marker);
      });
      
      // Fit bounds if we have valid markers
      if (hasValidMarkers && mapMarkers.length > 1) {
        mapObj.fitBounds(bounds);
      }
      
      // Update markers state
      setMarkers(mapMarkers);
    };
    
    // Initialize the map
    initializeMap();
    
    // Cleanup function
    return () => {
      isMounted = false;
      
      // Clear all markers
      if (mapMarkers) {
        mapMarkers.forEach(marker => marker.setMap(null));
      }
      
      // Close info window
      if (infoWindowInstance) {
        infoWindowInstance.close();
      }
      
      // Clear references
      mapInstance = null;
      infoWindowInstance = null;
      mapMarkers = [];
    };
  }, [uniqueKey, lat, lng, zoom, places]); // Include uniqueKey to ensure complete reinitialization
  
  // Render loading state while map is initializing
  if (!isLoaded && typeof window !== 'undefined') {
    return (
      <div className="relative w-full h-[70vh] bg-gray-100 flex items-center justify-center">
        <div className="animate-pulse text-center">
          <div className="inline-block w-8 h-8 border-4 border-edinburgh-blue border-t-transparent rounded-full animate-spin mb-2"></div>
          <p>Loading map...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="relative w-full h-[70vh]" key={uniqueKey}>
      <div id="map" className="w-full h-full" />
    </div>
  );
}

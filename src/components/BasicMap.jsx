'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Custom info panel component
const CustomInfoPanel = ({ place, onClose }) => {
  return (
    <div className="absolute bg-white shadow-lg rounded-md p-6 z-10 w-96">
      <button 
        onClick={onClose}
        className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 text-xl"
      >
        ×
      </button>
      <h3 className="font-bold text-xl mb-2">{place.name}</h3>
      <p className="text-base text-gray-600 mb-3">{place.address}</p>
      {place.type_name && <p className="text-base mb-3">{place.type_name}</p>}
      <Link 
        href={`/places/${place.id}`}
        className="text-base text-edinburgh-blue hover:underline font-medium"
      >
        View Details
      </Link>
    </div>
  );
};

// Basic map component with minimal dependencies
export default function BasicMap({ 
  places = [], 
  centerLat = 55.9533, 
  centerLng = -3.1883, 
  zoom = 13,
  onBoundsChange = null,
  showNumberedMarkers = false,
  onMarkerHover = null,
  onMarkerLeave = null,
  highlightedIndex = null,
  onMarkerClick = null,
  selectedPlaceIndex = null
}) {
  // Component receives places, center coordinates, zoom level, and callback functions
  // Prevent excessive console logging
  // console.log("BasicMap: received places prop:", places.map(p => ({ id: p.id, name: p.name })));
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const [customInfoPanel, setCustomInfoPanel] = useState(null);
  const [infoPanelPosition, setInfoPanelPosition] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const router = useRouter();
  
  // Remove any references to infoWindowRef since we're using custom panels
  
  // Type colors for markers
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
  
  const GOOGLE_MAPS_CALLBACK_NAME = 'initGoogleMapsGlobal'; // Ensure a unique global callback name

  useEffect(() => {
    if (window.google && window.google.maps) {
      setIsLoaded(true);
      return;
    }

    // Check if the script is already trying to load or has loaded
    if (window.googleMapsScriptLoadingState === 'loading' || window.googleMapsScriptLoadingState === 'loaded') {
      // If loaded, but this instance's isLoaded is false, set it.
      if (window.googleMapsScriptLoadingState === 'loaded') {
        setIsLoaded(true);
      }
      // If loading, this instance just waits. The callback will update all instances.
      // To ensure all instances update, the callback could dispatch a custom event.
      // For now, we rely on re-renders or isLoaded state being checked again.
      return;
    }

    // This instance will take charge of loading the script.
    window.googleMapsScriptLoadingState = 'loading';

    // Define the global callback if it hasn't been defined yet.
    if (typeof window[GOOGLE_MAPS_CALLBACK_NAME] !== 'function') {
      window[GOOGLE_MAPS_CALLBACK_NAME] = () => {
        setIsLoaded(true); // This will trigger re-render for the instance that set it.
        window.googleMapsScriptLoadingState = 'loaded';
        // To update other potentially mounted BasicMap instances:
        // window.dispatchEvent(new CustomEvent('googleMapsLoaded'));
      };
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error('Google Maps API key is missing.');
      setLoadError(true);
      window.googleMapsScriptLoadingState = 'error';
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-api-script'; // Add an ID to check for existence more reliably
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=${GOOGLE_MAPS_CALLBACK_NAME}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      setLoadError(true);
      window.googleMapsScriptLoadingState = 'error';
      console.error('Failed to load Google Maps script.');
    };

    // Only append the script if it doesn't already exist.
    if (!document.getElementById('google-maps-api-script')) {
      document.head.appendChild(script);
    }

    // No specific cleanup needed for the script tag or global callback in this model,
    // as they are intended to be global and persist.
  }, []); // Empty dependency array: runs once per component instance mount/unmount
  
  // Stable references for places data to prevent unnecessary re-renders
  const placesRef = useRef(places);
  
  // Update map when places change, with careful re-render management
  useEffect(() => {
    // Only run if Google Maps is loaded and we have a map instance
    if (!isLoaded || !mapInstanceRef.current) return;
    
    // Check if places have actually changed to avoid unnecessary map updates
    const placeIds = places.map(p => p.id).sort().join(',');
    const prevPlaceIds = placesRef.current.map(p => p.id).sort().join(',');
    
    if (placeIds !== prevPlaceIds) {
      console.log('Places changed, updating markers');
      // Add markers for the filtered places
      addMarkers(mapInstanceRef.current, places);
      // Update ref with current places
      placesRef.current = places;
    }
  }, [isLoaded, places]);

  // Highlight marker with flashing animation when hoveredPlaceIndex changes
  useEffect(() => {
    if (!isLoaded || highlightedIndex === null || !window.markerIndicesMap) return;
    
    // Find the marker by index
    const markerToHighlight = window.markerIndicesMap?.get(highlightedIndex);
    
    if (markerToHighlight) {
      try {
        // Set up flashing interval instead of bounce animation
        let visible = true;
        const flashInterval = setInterval(() => {
          try {
            visible = !visible;
            markerToHighlight.setVisible(visible);
          } catch (e) {
            console.error('Error during marker flash:', e);
            clearInterval(flashInterval);
          }
        }, 300); // Flash every 300ms
        
        // Cleanup function to clear interval when component unmounts or highlightedIndex changes
        return () => {
          clearInterval(flashInterval);
          // Make sure marker is visible when we stop flashing
          if (markerToHighlight) {
            try {
              markerToHighlight.setVisible(true);
            } catch (e) {
              console.error('Error resetting marker visibility:', e);
            }
          }
        };
      } catch (error) {
        console.error('Error setting up marker flash:', error);
      }
    }
  }, [isLoaded, highlightedIndex]);

  // Handle selected place index changes - with safeguards
  useEffect(() => {
    if (!isLoaded || selectedPlaceIndex === null || !window.markerIndicesMap || !mapInstanceRef.current) return;
    
    // Find the marker by original index
    const selectedMarker = window.markerIndicesMap?.get(selectedPlaceIndex);
    
    if (selectedMarker) {
      try {
        // Center map on the selected marker
        mapInstanceRef.current.panTo(selectedMarker.getPosition());
        
        // Trigger marker's click event
        window.google.maps.event.trigger(selectedMarker, 'click');
      } catch (error) {
        console.error('Error handling selected place:', error);
      }
    }
  }, [isLoaded, selectedPlaceIndex]);

  // Initialize the map - with more robust error handling
  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;
    
    // Store initial zoom for reference
    const initZoom = zoom;
    
    // Create map with explicit zoom setting
    const mapOptions = {
      center: { lat: centerLat, lng: centerLng },
      zoom: zoom,
      mapTypeControl: false,
      fullscreenControl: false,
      streetViewControl: false,
      // Disable auto-fitting behaviors that might override our zoom
      gestureHandling: 'cooperative',
      maxZoom: 18,
      minZoom: 10
    };
    
    // Create new map instance
    const map = new window.google.maps.Map(mapRef.current, mapOptions);
    mapInstanceRef.current = map;
    
    // Add zoom change listener to track zoom changes (but don't log them)
    
    // Explicitly set zoom again after a short delay to override any auto-behaviors
    setTimeout(() => {
      if (map && typeof zoom === 'number') {
        // Set zoom explicitly to override any auto-behaviors
        map.setZoom(zoom);
        map.setCenter({ lat: centerLat, lng: centerLng });
      }
    }, 100);
    
    // Close custom info panel when clicking elsewhere on the map
    map.addListener('click', () => {
      setCustomInfoPanel(null);
      
      // Notify parent component about closing the info panel
      if (onMarkerClick) {
        onMarkerClick(null);
      }
      
      // When panel is closed by clicking on map, clear the selected place index
      if (selectedPlaceIndex !== null) {
        // Also stop any flashing markers
        const markerToStop = window.markerIndicesMap?.get(selectedPlaceIndex);
        if (markerToStop) {
          markerToStop.setVisible(true); // Make sure marker is visible
        }
      }
    });
    
    // Add markers if we have places without auto-fitting bounds
    if (places && places.length > 0) {
      // Pass false to prevent auto-fitting bounds which would reset zoom
      addMarkers(map, places, false);
    }
    
    // Add bounds change listener if callback provided
    if (onBoundsChange) {
      map.addListener('idle', () => {
        const bounds = map.getBounds();
        if (bounds) {
          const currentZoom = map.getZoom();
          const currentCenter = map.getCenter() ? {
            lat: map.getCenter().lat(),
            lng: map.getCenter().lng()
          } : { lat: centerLat, lng: centerLng };
          
          onBoundsChange(bounds, currentCenter, currentZoom);
        }
      });
      
      // Trigger initial bounds once they're available
      setTimeout(() => {
        if (map && map.getBounds()) {
          const currentZoom = map.getZoom();
          const currentCenter = map.getCenter() ? {
            lat: map.getCenter().lat(),
            lng: map.getCenter().lng()
          } : { lat: centerLat, lng: centerLng };
          
          onBoundsChange(map.getBounds(), currentCenter, currentZoom);
        }
      }, 500);
    }
    
    // Cleanup function when component unmounts
    return () => {
      
      clearMarkers();
      // Reset custom panel state
      setCustomInfoPanel(null);
      setInfoPanelPosition(null);
      mapInstanceRef.current = null;
    };
  }, [isLoaded, places, centerLat, centerLng, zoom]);
  
  // Effect to handle prop changes
  useEffect(() => {
    // Apply center and zoom changes to map if props change and map exists
    if (isLoaded && mapInstanceRef.current) {
      mapInstanceRef.current.setCenter({ lat: centerLat, lng: centerLng });
      mapInstanceRef.current.setZoom(zoom);
    }
  }, [centerLat, centerLng, zoom, isLoaded]);

  // Function to group places by location for handling overlaps
  const groupPlacesByLocation = (places) => {
    const locationGroups = new Map();

    places.forEach((place) => {
      // Skip places without coordinates
      if (!place.lat || !place.lng) return;

      // Create a location key using lat/lng rounded to 5 decimal places (approx 1.1 meters precision)
      const locationKey = `${place.lat.toFixed(5)},${place.lng.toFixed(5)}`;

      if (!locationGroups.has(locationKey)) {
        locationGroups.set(locationKey, []);
      }

      // Push the place object, which already contains the correct originalIndex from the server.
      locationGroups.get(locationKey).push(place);
    });

    return locationGroups;
  };

  // Function to calculate offset for overlapping markers
  const calculateMarkerOffset = (index, total) => {
    if (total <= 1) return { lat: 0, lng: 0 };

    // For multiple markers at same location, arrange in a small circle pattern
    const radius = 0.00018; // Approximately 20 meters
    const angle = (index / total) * 2 * Math.PI;

    return {
      lat: radius * Math.sin(angle),
      lng: radius * Math.cos(angle)
    };
  };

  // Function to add markers to the map
  const addMarkers = (map, placesArray, fitBounds = true) => {
    // Clear existing markers
    clearMarkers();
    
    // Capture current zoom before adding markers
    const beforeZoom = map ? map.getZoom() : null;
    
    // Create bounds to fit all markers only if fitBounds is true
    const bounds = new window.google.maps.LatLngBounds();
    let validMarkers = false;
    
    // Add markers to the map, optionally fitting bounds
    
    // Create a marker map to store original indices
    const markerIndices = new Map();
    
    // Group places by location to handle overlaps
    const locationGroups = groupPlacesByLocation(placesArray);
    
    // Flattened array to hold all new markers
    const newMarkers = [];
    
    // Process each location group
    locationGroups.forEach((placesAtSameLocation, locationKey) => {
      // Add markers for each place at this location with offset
      placesAtSameLocation.forEach((place, groupIndex) => {
        // Get marker color based on type
        const color = typeColors[place.type_id] || '#AAAAAA';
      
      // Use the original index for the marker label and highlighting
      const originalIndex = place.originalIndex;
      
      // Calculate offset for this marker if it's in a group
      const offset = calculateMarkerOffset(groupIndex, placesAtSameLocation.length);

      // New detailed log for position calculation
      console.log(
        `BasicMap addMarkers: Processing place - Name: "${place.name}", ID: ${place.id}, originalIndex: ${originalIndex}, ` +
        `BaseCoords: {lat: ${place.lat}, lng: ${place.lng}}, ` +
        `groupIndex: ${groupIndex}, groupLength: ${placesAtSameLocation.length}, ` +
        `CalculatedOffset: {lat: ${offset.lat.toFixed(6)}, lng: ${offset.lng.toFixed(6)}}, ` +
        `FinalCoords: {lat: ${(place.lat + offset.lat).toFixed(6)}, lng: ${(place.lng + offset.lng).toFixed(6)}}`
      );
      
      const markerLabelText = showNumberedMarkers && typeof originalIndex === 'number' ? `${originalIndex + 1}` : null;
      
      // Create marker with either number or color based on showNumberedMarkers prop
      const marker = new window.google.maps.Marker({
        // Store the original index in the marker object
        originalIndex: originalIndex,
        position: { 
          lat: place.lat + offset.lat, 
          lng: place.lng + offset.lng 
        },
        map,
        title: place.name,
        icon: showNumberedMarkers ? {
          // Create a numbered marker
          path: window.google.maps.SymbolPath.CIRCLE,
          fillColor: color,
          fillOpacity: 0.9,
          strokeColor: '#FFFFFF',
          strokeWeight: 2,
          scale: 20, // Doubled from 10 to 20
          labelOrigin: new window.google.maps.Point(0, 0)
        } : {
          // Use the color circle marker
          path: window.google.maps.SymbolPath.CIRCLE,
          fillColor: color,
          fillOpacity: 0.9,
          strokeColor: '#FFFFFF',
          strokeWeight: 2,
          scale: 16, // Doubled from 8 to 16
        },
        label: markerLabelText ? { // Use the pre-calculated markerLabelText
          text: markerLabelText,
          color: '#FFFFFF',
          fontSize: '14px',
          fontWeight: 'bold'
        } : null
      });
      
      // Add mouse events for hovering
      if (onMarkerHover) {
        marker.addListener('mouseover', () => {
          onMarkerHover(originalIndex);
        });
      }
      
      if (onMarkerLeave) {
        marker.addListener('mouseout', () => {
          onMarkerLeave();
        });
      }
      
      // Add click handler for marker selection
      marker.addListener('click', (e) => {
        // Prevent event propagation to map
        if (e.domEvent) {
          e.domEvent.stopPropagation();
        }
        
        // Show custom info panel for this place
        setCustomInfoPanel(place);
        
        // Calculate position for the info panel (offset from marker position)
        const position = marker.getPosition();
        const pixelPosition = getPixelPositionFromLatLng(position, map);
        if (pixelPosition) {
          setInfoPanelPosition({
            left: pixelPosition.x + 15, // Offset to the right of the marker
            top: pixelPosition.y - 120  // Increased offset above the marker to account for larger panel
          });
        }
        
        // Notify parent component about marker click
        if (onMarkerClick) {
          onMarkerClick(originalIndex);
        }
      });
      
      // Extend bounds
      bounds.extend(marker.getPosition());
      validMarkers = true;
      
      // Add marker to the array
      newMarkers.push(marker);
    });
  });
  
  // Store markers reference with originalIndex for lookup
  markersRef.current = newMarkers;
  
  // Store the original index to marker mapping
  newMarkers.forEach(marker => {
    if (marker && marker.originalIndex !== undefined) {
      markerIndices.set(marker.originalIndex, marker);
    }
  });
  
  // Store the marker indices map in a ref
  window.markerIndicesMap = markerIndices;
  
  // Fit bounds only if explicitly requested and we have valid markers
  if (fitBounds && validMarkers && newMarkers.length > 1) {
    // Save the current zoom before fitting bounds
    const zoomBeforeFit = map.getZoom();
    
    // Fit bounds to include all markers
    map.fitBounds(bounds);
    
    // Restore zoom if it was changed by fitBounds and we have a zoom prop
    // This is the key fix that preserves zoom levels
    if (typeof zoom === 'number') {
      setTimeout(() => map.setZoom(zoom), 100);
    }
  } else {
    // Skip bounds fitting to preserve zoom level
  }
};
  
  // Function to safely clear all markers
  const clearMarkers = () => {
    if (markersRef.current) {
      markersRef.current.forEach(marker => {
        if (marker) marker.setMap(null);
      });
      markersRef.current = [];
    }
    
    // Close any custom info panel
    setCustomInfoPanel(null);
  };
  
  // Show error if Maps API failed to load
  if (loadError) {
    return (
      <div className="bg-white shadow-md rounded-lg p-6 text-center">
        <h3 className="text-xl font-semibold text-red-600 mb-2">Map Unavailable</h3>
        <p className="mb-4">We couldn't load the map. Please check your internet connection and try again.</p>
      </div>
    );
  }
  
  // Show loading state
  if (!isLoaded) {
    return (
      <div className="bg-white shadow-md rounded-lg p-6 text-center h-[70vh] flex items-center justify-center">
        <div className="animate-pulse text-center">
          <div className="inline-block w-8 h-8 border-4 border-edinburgh-blue border-t-transparent rounded-full animate-spin mb-2"></div>
          <p>Loading map...</p>
        </div>
      </div>
    );
  }
  
  // Helper function to convert LatLng to pixel position
  const getPixelPositionFromLatLng = (latLng, map) => {
    if (!map || !map.getProjection()) return null;
    
    const projection = map.getProjection();
    const bounds = map.getBounds();
    if (!projection || !bounds) return null;
    
    const scale = 2 ** map.getZoom();
    const worldPoint = projection.fromLatLngToPoint(latLng);
    const topLeft = projection.fromLatLngToPoint({
      lat: bounds.getNorthEast().lat(),
      lng: bounds.getSouthWest().lng()
    });
    
    return {
      x: Math.floor((worldPoint.x - topLeft.x) * scale),
      y: Math.floor((worldPoint.y - topLeft.y) * scale)
    };
  };
  
  // Handle closing the custom info panel
  const handleCloseInfoPanel = (e) => {
    e.stopPropagation();
    setCustomInfoPanel(null);
    
    // Notify parent component about closing the info panel
    if (onMarkerClick) {
      // Pass null to indicate panel was closed
      onMarkerClick(null);
    }
    
    // When panel is closed, clear the selected place index
    if (selectedPlaceIndex !== null) {
      // Also stop any flashing markers
      const markerToStop = window.markerIndicesMap?.get(selectedPlaceIndex);
      if (markerToStop) {
        markerToStop.setVisible(true); // Make sure marker is visible
      }
    }
  };
  
  // Render map container
  return (
    <div className="relative w-full h-[70vh] rounded-lg overflow-hidden">
      <div ref={mapRef} className="w-full h-full" id="google-map-container" />
      
      {/* Custom info panel */}
      {customInfoPanel && infoPanelPosition && (
        <div 
          style={{
            position: 'absolute',
            left: `${infoPanelPosition.left}px`,
            top: `${infoPanelPosition.top}px`
          }}
        >
          <CustomInfoPanel 
            place={customInfoPanel} 
            onClose={handleCloseInfoPanel} 
          />
        </div>
      )}
    </div>
  );
}

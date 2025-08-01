'use client';

import { useState, useEffect, useCallback } from 'react';
import { GoogleMap, LoadScript, Marker, InfoWindow } from '@react-google-maps/api';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';

// Import client-safe utilities
import { formatTimeFor12Hour, cleanOpeningHoursText } from '@/lib/client-utils';

// This will be replaced with actual data from API in client component
const edinburghCenter = {
  lat: 55.9533,
  lng: -3.1883
};

const mapContainerStyle = {
  width: '100%',
  height: '70vh',
};

const markerIcons = {
  1: '🏛️', // Antique Shop
  2: '🔨', // Auction House
  3: '📚', // Book Shop
  4: '💿', // Record Shop
  5: '👗', // Vintage Clothing
  6: '🎪', // Antique Fair
  7: '🪑', // Furniture
  8: '🧸', // Charity Shop
};

interface Place {
  id: number;
  name: string;
  address: string;
  description: string | null;
  lat: number;
  lng: number;
  type_id: number;
  type_name: string;
  price_range: string | null;
  website: string | null;
}

// Neighborhood interface removed

interface PlaceType {
  id: number;
  name: string;
}

interface FilterOptions {
  type_id?: number;
  price_range?: string;
}

export default function MapClient({
  initialPlaces,
  placeTypes
}: {
  initialPlaces: Place[];
  placeTypes: PlaceType[];
}) {
  // Add a unique key that changes whenever the component is mounted
  // This forces a complete remount when navigating back to this page
  const [componentKey, setComponentKey] = useState<string>(Date.now().toString());
  const [places] = useState<Place[]>(initialPlaces);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({});
  const [mapError, setMapError] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  
  // Navigation hooks
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  
  // Force remount when navigating back to this page
  useEffect(() => {
    // Generate a new component key whenever the pathname is /map
    // This will force a complete remount of the component
    if (pathname === '/map') {
      setComponentKey(Date.now().toString());
    }
    
    // Handle window focus and popstate events
    const handleRouteChange = () => {
      if (pathname === '/map') {
        // Use setTimeout to ensure we run after React's render cycle
        setTimeout(() => {
          setComponentKey(Date.now().toString());
          // Force a hard reload if necessary
          if (typeof window !== 'undefined' && window.google && window.google.maps) {
            window.location.reload();
          }
        }, 100);
      }
    };
    
    // Add event listeners for navigation and focus
    window.addEventListener('focus', handleRouteChange);
    window.addEventListener('popstate', handleRouteChange);
    
    // Check and update online status
    if (typeof navigator !== 'undefined') {
      setIsOnline(navigator.onLine);
    }
    
    // Clean up event listeners
    return () => {
      window.removeEventListener('focus', handleRouteChange);
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, [pathname]);

  useEffect(() => {
    // Load filter parameters from URL if present
    if (searchParams) {
      const typeId = searchParams.get('type');
      const priceRange = searchParams.get('price');
      
      const newFilters: FilterOptions = {};
      if (typeId) newFilters.type_id = parseInt(typeId);
      if (priceRange) newFilters.price_range = priceRange;
      
      setFilters(newFilters);
    }
    

  }, [searchParams]);
  
  const filteredPlaces = places.filter(place => {
    if (filters.type_id && place.type_id !== filters.type_id) return false;
    if (filters.price_range && place.price_range !== filters.price_range) return false;
    return true;
  });
  
  const handleFilterChange = (filterType: keyof FilterOptions, value: string) => {
    if (filterType === 'type_id') {
      const numValue = value ? parseInt(value) : undefined;
      setFilters(prev => ({
        ...prev,
        [filterType]: numValue
      }));
    } else {
      // For price_range, use the string value directly
      setFilters(prev => ({
        ...prev,
        [filterType]: value || undefined
      }));
    }
  };
  
    // Map type IDs to colors for offline and online modes
  const typeColors = {
    1: { color: '#FF4136', name: 'Antique Shop' }, // Red
    2: { color: '#0074D9', name: 'Auction House' }, // Blue
    3: { color: '#2ECC40', name: 'Book Shop' }, // Green
    4: { color: '#B10DC9', name: 'Record Shop' }, // Purple
    5: { color: '#FFDC00', name: 'Vintage Clothing' }, // Yellow
    6: { color: '#FF851B', name: 'Antique Fair' }, // Orange
    7: { color: '#8B4513', name: 'Furniture' }, // Brown
    8: { color: '#444444', name: 'Charity Shop' }, // Dark Grey
  };

  // For Google Maps markers that work both online and offline using SVG data URLs
  const getMarkerIcon = (typeId: number) => {
    // Map of colors by type ID
    const colorMap = {
      1: '#FF4136', // Antique Shop (Red)
      2: '#0074D9', // Auction House (Blue)
      3: '#2ECC40', // Book Shop (Green)
      4: '#B10DC9', // Record Shop (Purple)
      5: '#FFDC00', // Vintage Clothing (Yellow)
      6: '#FF851B', // Antique Fair (Orange)
      7: '#8B4513', // Furniture (Brown)
      8: '#444444', // Charity Shop (Dark Grey)
    };
    
    // Get color or fallback to red
    const color = colorMap[typeId as keyof typeof colorMap] || '#FF4136';
    
    // Create SVG marker as a data URL that works offline
    // Simple circle with white border
    const svgMarker = encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" fill="${color}" stroke="white" stroke-width="2"/>
      </svg>
    `);
    
    return `data:image/svg+xml;charset=UTF-8,${svgMarker}`;
  };
  
  useEffect(() => {
    // Set initial online state
    if (typeof navigator !== 'undefined') {
      setIsOnline(navigator.onLine);
    }
    
    // Add event listeners for online/offline status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // This will handle scenario where Google Maps might fail to load
  // even though we think we're online
  const handleMapError = useCallback(() => {
    setMapError(true);
    console.error('Google Maps failed to load');
  }, []);
  
  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="typeFilter" className="form-label">Filter by Category</label>
            <select 
              id="typeFilter"
              className="input"
              value={filters.type_id || ''}
              onChange={(e) => handleFilterChange('type_id', e.target.value)}
            >
              <option value="">All Categories</option>
              {placeTypes.map(type => (
                <option key={type.id} value={type.id}>{type.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="priceFilter" className="form-label">Filter by Price Range</label>
            <select 
              id="priceFilter"
              className="input"
              value={filters.price_range || ''}
              onChange={(e) => handleFilterChange('price_range', e.target.value)}
            >
              <option value="">All Price Ranges</option>
              <option value="£">£ (Budget)</option>
              <option value="££">££ (Mid-range)</option>
              <option value="£££">£££ (High-end)</option>
              <option value="££££">££££ (Luxury)</option>
            </select>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-1 rounded-lg shadow-md">
        {(mapError || !isOnline) ? (
          <div className="bg-edinburgh-stone p-6 rounded-lg min-h-[50vh]">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold mb-2">
                {!isOnline ? "You're currently offline" : "Map temporarily unavailable"}
              </h3>
              <p className="mb-2">Showing {filteredPlaces.length} antique locations in Edinburgh</p>
              <p className="text-sm">Using simplified map visualization</p>
            </div>
            
            {/* Simplified map visualization for offline mode */}
            <div className="relative border-2 border-gray-300 rounded-lg bg-gray-100 h-[50vh] overflow-hidden">
              {/* Edinburgh outline silhouette as background */}
              <div className="absolute inset-0 flex items-center justify-center opacity-10">
                <div className="text-6xl font-bold">Edinburgh</div>
              </div>
              
              {/* Simplified markers */}
              {filteredPlaces.map((place) => {
                // Calculate relative position based on lat/lng
                // This is a very simplified positioning algorithm
                // Edinburgh bounds: roughly 55.9-55.98 lat, -3.16 to -3.28 lng
                const latRange = [55.9, 55.98];
                const lngRange = [-3.28, -3.16];
                
                // Calculate position as percentage
                const x = ((place.lng - lngRange[0]) / (lngRange[1] - lngRange[0])) * 100;
                const y = ((latRange[1] - place.lat) / (latRange[1] - latRange[0])) * 100;
                
                const color = typeColors[place.type_id as keyof typeof typeColors]?.color || '#999';
                
                return (
                  <div 
                    key={place.id}
                    className="absolute cursor-pointer transition-transform hover:scale-110"
                    style={{
                      left: `${x}%`,
                      top: `${y}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                    onClick={() => setSelectedPlace(place)}
                  >
                    <div 
                      className="h-4 w-4 rounded-full shadow-md border border-white"
                      style={{ backgroundColor: color }}
                    ></div>
                  </div>
                );
              })}
              
              {/* Simplified info window for selected place */}
              {selectedPlace && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white p-3 rounded-lg shadow-lg max-w-xs z-10">
                  <button 
                    className="absolute top-1 right-1 text-gray-500 hover:text-gray-700"
                    onClick={() => setSelectedPlace(null)}
                  >
                    ×
                  </button>
                  <h3 className="font-semibold">{selectedPlace.name}</h3>
                  <p className="text-sm text-gray-600">{selectedPlace.type_name}</p>
                  {selectedPlace.price_range && (
                    <p className="text-xs mt-1">Price: {selectedPlace.price_range}</p>
                  )}
                  <Link 
                    href={`/places/${selectedPlace.id}`}
                    className="text-xs text-edinburgh-blue hover:underline block mt-2"
                  >
                    View Details
                  </Link>
                </div>
              )}
              
              {/* Legend */}
              <div className="absolute bottom-0 right-0 bg-white bg-opacity-90 p-2 rounded-tl-lg text-xs">
                <div className="font-semibold mb-1">Map Legend:</div>
                {Object.entries(typeColors).map(([typeId, { color, name }]) => (
                  <div key={typeId} className="flex items-center mb-1 last:mb-0">
                    <div 
                      className="h-3 w-3 rounded-full mr-1"
                      style={{ backgroundColor: color }}
                    ></div>
                    <span>{name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <LoadScript 
            googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}
            onError={handleMapError}
            onLoad={() => setMapError(false)}
            loadingElement={<div className="h-96 flex items-center justify-center">Loading map...</div>}
          >
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={edinburghCenter}
              zoom={13}
              options={{
                // Add some options for offline readiness
                streetViewControl: false,  // Don't need street view if offline
                mapTypeControl: false       // Simplify UI
              }}
            >
            {filteredPlaces.map((place) => (
              <Marker
                key={place.id}
                position={{ lat: place.lat, lng: place.lng }}
                onClick={() => setSelectedPlace(place)}
                icon={getMarkerIcon(place.type_id)}
              />
            ))}

            {selectedPlace && (
              <InfoWindow
                position={{ lat: selectedPlace.lat, lng: selectedPlace.lng }}
                onCloseClick={() => setSelectedPlace(null)}
              >
                <div className="max-w-xs">
                  <h3 className="font-semibold text-lg">{selectedPlace.name}</h3>
                  <p className="text-sm text-gray-500 mb-1">{selectedPlace.type_name}</p>
                  <p className="text-sm mb-2">{selectedPlace.address}</p>
                  {selectedPlace.price_range && (
                    <p className="text-sm mb-2">Price Range: {selectedPlace.price_range}</p>
                  )}
                  <div className="flex justify-between items-center">
                    <Link 
                      href={`/places/${selectedPlace.id}`} 
                      className="text-edinburgh-blue hover:underline"
                    >
                      View Details
                    </Link>
                    {selectedPlace.website && (
                      <a 
                        href={selectedPlace.website} 
                        className="text-edinburgh-blue hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Website
                      </a>
                    )}
                  </div>
                </div>
              </InfoWindow>
            )}
            </GoogleMap>
          </LoadScript>
        )}
      </div>
      
      <div className="bg-white p-4 rounded-lg shadow mt-4">
        <h2 className="text-xl font-semibold mb-3">Showing {filteredPlaces.length} locations</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPlaces.map(place => (
            <Link 
              key={place.id} 
              href={`/places/${place.id}`}
              className="p-4 border rounded-lg hover:bg-edinburgh-stone/10 transition-colors"
            >
              <h3 className="font-semibold">{place.name}</h3>
              <p className="text-sm text-gray-600">{place.type_name}</p>
              {place.price_range && (
                <p className="text-sm">Price Range: {place.price_range}</p>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

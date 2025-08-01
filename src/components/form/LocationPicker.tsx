'use client';

import React, { useState, useEffect } from 'react';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';
import { isInEdinburghArea } from '@/lib/validation-utils';

interface LocationPickerProps {
  lat: string;
  lng: string;
  address?: string;
  onChange: (lat: number, lng: number) => void;
  error?: string | null;
}

// Default Edinburgh center coordinates
const edinburghCenter = {
  lat: 55.9533,
  lng: -3.1883
};

const mapContainerStyle = {
  width: '100%',
  height: '400px',
  borderRadius: '0.5rem',
};

export default function LocationPicker({
  lat,
  lng,
  address,
  onChange,
  error,
}: LocationPickerProps) {
  // Ensure we always work with numbers internally
  const getNumericValue = (val: string): number => {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 55.9533 : parsed; // Default to Edinburgh center if invalid
  };

  const [markerPosition, setMarkerPosition] = useState({ 
    lat: getNumericValue(lat),
    lng: getNumericValue(lng)
  });
  const [mapCenter, setMapCenter] = useState(markerPosition);
  const [locationError, setLocationError] = useState<string | null | undefined>(error);
  const [searchInput, setSearchInput] = useState('');
  const [geocoder, setGeocoder] = useState<google.maps.Geocoder | null>(null);

  // Update position when props change
  useEffect(() => {
    // Get numeric values using our helper
    const numLat = getNumericValue(lat);
    const numLng = getNumericValue(lng);
    
    // Always update with valid numbers
    setMarkerPosition({ lat: numLat, lng: numLng });
  }, [lat, lng]);
  
  // Only use address for geocoding when explicitly requested by the user
  // This prevents coordinates from changing automatically when address changes

  // Validate location is in Edinburgh
  useEffect(() => {
    const latNum = markerPosition.lat;
    const lngNum = markerPosition.lng;
    
    if (!isInEdinburghArea(latNum, lngNum)) {
      setLocationError('Location appears to be outside Edinburgh area');
    } else {
      setLocationError(undefined);
    }
  }, [markerPosition]);

  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;

    const newPosition = {
      lat: e.latLng.lat(),
      lng: e.latLng.lng(),
    };
    
    setMarkerPosition(newPosition);
    onChange(newPosition.lat, newPosition.lng);
  };

  const handleMarkerDragEnd = (e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;

    const newPosition = {
      lat: e.latLng.lat(),
      lng: e.latLng.lng(),
    };
    
    setMarkerPosition(newPosition);
    onChange(newPosition.lat, newPosition.lng);
  };

  // Geocode an address string - only called when user explicitly clicks search button
  const geocodeAddress = (addressString: string) => {
    if (!addressString.trim()) return;
    
    // If precise coordinates are already set, we don't override them with defaults
    const currentLat = getNumericValue(lat);
    const currentLng = getNumericValue(lng);
    const hasCustomCoordinates = 
      (currentLat !== 55.9533 || currentLng !== -3.1883) && // Not default Edinburgh center
      isInEdinburghArea(currentLat, currentLng); // Is in Edinburgh area
    
    // Only change position if no custom coordinates are set
    if (!hasCustomCoordinates) {
      // Default Edinburgh position
      const newPosition = {
        lat: 55.9533,
        lng: -3.1883
      };
      
      setMarkerPosition(newPosition);
      setMapCenter(newPosition);
      onChange(newPosition.lat, newPosition.lng);
    } else {
      // Just center map on existing precise coordinates
      setMapCenter({ lat: currentLat, lng: currentLng });
    }
    
    setSearchInput(addressString);
    
    // Show helpful message only if using default coordinates
    if (!hasCustomCoordinates) {
      setLocationError('For precise location, please drag the marker to the exact shop location');
    }
  };

  const handleSearchLocation = (e: React.FormEvent) => {
    e.preventDefault();
    geocodeAddress(searchInput);
  };

  // Safely initialize the geocoder when Google Maps loads
  const handleGoogleLoad = () => {
    if (window.google && window.google.maps) {
      setGeocoder(new window.google.maps.Geocoder());
    }
  };

  return (
    <div className="location-picker">
      <div className="mb-4">
        <form onSubmit={handleSearchLocation} className="flex gap-2">
          <input
            type="text"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:border-edinburgh-blue focus:ring focus:ring-edinburgh-blue/20"
            placeholder="Search for address in Edinburgh"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <button
            type="submit"
            className="px-4 py-2 bg-edinburgh-blue text-white rounded-md hover:bg-edinburgh-blue/90"
          >
            Find
          </button>
        </form>
        <p className="text-sm text-gray-500 mt-1">
          Search for an address or click/drag on the map to set location
        </p>
      </div>

      {locationError && (
        <div className="mb-4 p-3 bg-yellow-50 text-yellow-800 border border-yellow-200 rounded-md">
          {locationError}
        </div>
      )}

      <LoadScript
        googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}
        onLoad={handleGoogleLoad}
        loadingElement={<div className="h-96 bg-gray-100 flex items-center justify-center">Loading map...</div>}
      >
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={mapCenter}
          zoom={14}
          onClick={handleMapClick}
        >
          <Marker
            position={markerPosition}
            draggable={true}
            onDragEnd={handleMarkerDragEnd}
          />
        </GoogleMap>
      </LoadScript>

      {/* Latitude and longitude fields are now hidden from the user interface */}
      <input type="hidden" value={markerPosition.lat} />
      <input type="hidden" value={markerPosition.lng} />

      <div className="mt-4 text-sm text-gray-500">
        <p>
          <span className="font-medium">Tip:</span> For the most accurate placement, zoom in and fine-tune the marker position
        </p>
      </div>
    </div>
  );
}

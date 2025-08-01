'use client';

import { useEffect, useState } from 'react';
import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from '@react-google-maps/api';
import { useRouter } from 'next/navigation';

// Get Google Maps API key from env
const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

interface Place {
  id: number;
  name: string;
  address?: string;
  lat: number;
  lng: number;
  type_name?: string;
}

interface SmallMapProps {
  lat: number;
  lng: number;
  zoom?: number;
  places: Place[];
  height?: string;
}

const mapContainerStyle = {
  width: '100%',
  height: '300px',
  borderRadius: '0.5rem',
};

export default function SmallMap({
  lat,
  lng,
  zoom = 14,
  places,
  height = '300px'
}: SmallMapProps) {
  const router = useRouter();
  const [activeMarker, setActiveMarker] = useState<number | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey,
  });
  
  // Custom styles to match the Edinburgh Antiques Trail theme
  const mapStyles = [
    {
      featureType: 'all',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#616161' }]
    },
    {
      featureType: 'all',
      elementType: 'labels.text.stroke',
      stylers: [{ color: '#f5f5f5' }]
    },
    {
      featureType: 'administrative',
      elementType: 'geometry.stroke',
      stylers: [{ color: '#fefefe' }]
    },
    {
      featureType: 'administrative.land_parcel',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#bdbdbd' }]
    },
    {
      featureType: 'poi',
      elementType: 'geometry',
      stylers: [{ color: '#eeeeee' }]
    },
    {
      featureType: 'poi',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#757575' }]
    },
    {
      featureType: 'poi.park',
      elementType: 'geometry',
      stylers: [{ color: '#e5e5e5' }]
    },
    {
      featureType: 'poi.park',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#9e9e9e' }]
    },
    {
      featureType: 'road',
      elementType: 'geometry',
      stylers: [{ color: '#ffffff' }]
    },
    {
      featureType: 'road.arterial',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#757575' }]
    },
    {
      featureType: 'road.highway',
      elementType: 'geometry',
      stylers: [{ color: '#dadada' }]
    },
    {
      featureType: 'road.highway',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#616161' }]
    },
    {
      featureType: 'road.local',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#9e9e9e' }]
    },
    {
      featureType: 'transit.line',
      elementType: 'geometry',
      stylers: [{ color: '#e5e5e5' }]
    },
    {
      featureType: 'transit.station',
      elementType: 'geometry',
      stylers: [{ color: '#eeeeee' }]
    },
    {
      featureType: 'water',
      elementType: 'geometry',
      stylers: [{ color: '#c9c9c9' }]
    },
    {
      featureType: 'water',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#9e9e9e' }]
    }
  ];

  useEffect(() => {
    if (isLoaded) {
      // Set a timeout to ensure the map loads fully
      const timer = setTimeout(() => {
        setMapLoaded(true);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [isLoaded]);

  if (!isLoaded) {
    return (
      <div 
        className="bg-gray-100 rounded-lg flex items-center justify-center"
        style={{ height }}
      >
        <div className="animate-pulse">
          <div className="h-8 w-8 bg-gray-200 rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  const center = {
    lat,
    lng
  };

  const mapOptions = {
    disableDefaultUI: true,
    zoomControl: true,
    styles: mapStyles,
    gestureHandling: 'cooperative' as const,
  };
  
  const handleMarkerClick = (markerId: number) => {
    setActiveMarker(markerId === activeMarker ? null : markerId);
  };

  return (
    <GoogleMap
      mapContainerStyle={{
        ...mapContainerStyle,
        height
      }}
      center={center}
      zoom={zoom}
      options={mapOptions}
    >
      {places.map((place) => (
        <Marker
          key={place.id}
          position={{ lat: place.lat, lng: place.lng }}
          onClick={() => handleMarkerClick(place.id)}
          icon={{
            url: '/marker-antique.svg',
            scaledSize: new window.google.maps.Size(32, 32),
          }}
        >
          {activeMarker === place.id && (
            <InfoWindow
              onCloseClick={() => setActiveMarker(null)}
              options={{
                pixelOffset: new window.google.maps.Size(0, -30)
              }}
            >
              <div className="p-2 max-w-xs">
                <h3 className="font-medium text-sm">{place.name}</h3>
                {place.address && <p className="text-xs text-gray-500 mt-1">{place.address}</p>}
                {place.type_name && <p className="text-xs text-gray-500 mt-1">Type: {place.type_name}</p>}
                <button 
                  className="text-xs text-edinburgh-blue mt-2 font-medium"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/places/${place.id}`);
                  }}
                >
                  View Details
                </button>
              </div>
            </InfoWindow>
          )}
        </Marker>
      ))}
    </GoogleMap>
  );
}

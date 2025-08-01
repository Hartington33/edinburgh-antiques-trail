'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

// Define types
interface MapCenter {
  lat: number;
  lng: number;
}

interface MapState {
  zoom: number;
  center: MapCenter;
}

interface MapContextType {
  mapState: MapState;
  setMapState: (state: MapState) => void;
}

// Default map state
const DEFAULT_ZOOM = 13;
const DEFAULT_CENTER = { lat: 55.9533, lng: -3.1883 }; // Edinburgh center

// Create context with default values
const MapContext = createContext<MapContextType>({
  mapState: {
    zoom: DEFAULT_ZOOM,
    center: DEFAULT_CENTER,
  },
  setMapState: () => {},
});

// Provider component
export const MapProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize with values from localStorage if available
  const [mapState, setMapStateRaw] = useState<MapState>(() => {
    if (typeof window === 'undefined') {
      return { zoom: DEFAULT_ZOOM, center: DEFAULT_CENTER };
    }

    try {
      const savedMapState = localStorage.getItem('mapState');
      if (savedMapState) {
        const parsed = JSON.parse(savedMapState);
        return {
          zoom: parsed.zoom || DEFAULT_ZOOM,
          center: parsed.center || DEFAULT_CENTER,
        };
      }
    } catch (error) {
      // Silent error handling for localStorage operations
    }

    return { zoom: DEFAULT_ZOOM, center: DEFAULT_CENTER };
  });

  // Wrapper function to also persist to localStorage
  const setMapState = (state: MapState) => {
    setMapStateRaw(state);
    
    // Save to localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('mapState', JSON.stringify({
          ...state,
          timestamp: Date.now(),
        }));
      } catch (error) {
        // Silent error handling for localStorage operations
      }
    }
  };

  // Ensure we save state before unload
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleBeforeUnload = () => {
        try {
          localStorage.setItem('mapState', JSON.stringify({
            ...mapState,
            timestamp: Date.now(),
          }));
        } catch (error) {
          // Silent error handling for localStorage operations
        }
      };

      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  }, [mapState]);

  return (
    <MapContext.Provider value={{ mapState, setMapState }}>
      {children}
    </MapContext.Provider>
  );
};

// Custom hook to use the map context
export const useMapContext = () => useContext(MapContext);

export default MapContext;

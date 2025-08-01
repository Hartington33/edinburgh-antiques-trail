'use client';

import { useState, useEffect, useRef, useCallback, useReducer } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import MapCategoryLegend from '@/components/MapCategoryLegend';
import HierarchicalSpecialtyFilter from '@/components/HierarchicalSpecialtyFilter';
import Link from 'next/link';
import { useMapContext } from '@/contexts/MapContext';

// Define interface for the map component props
interface BasicMapProps {
  places: Place[];
  centerLat: number;
  centerLng: number;
  zoom: number;
  onBoundsChange?: (bounds: any) => void;
  showNumberedMarkers?: boolean;
  onMarkerHover?: (index: number | null) => void;
  onMarkerLeave?: () => void;
  highlightedIndex?: number | null;
  onMarkerClick?: (index: number | null) => void;
  selectedPlaceIndex?: number | null;
}

// Import the map component with dynamic import to avoid SSR issues
const BasicMapComponent = dynamic(
  () => import('@/components/BasicMap'), 
  { 
    ssr: false,
    // Set suspense true to handle loading more efficiently
    suspense: true,
    loading: () => (
      <div className="w-full h-96 bg-gray-100 flex items-center justify-center">
        <p className="text-gray-500">Loading map...</p>
      </div>
    )
  }
) as any; // Use 'any' to avoid TypeScript errors with dynamic imports

// Define our place types interface
interface PlaceType {
  id: number;
  name: string;
}

interface Place {
  id: number;
  name: string;
  address: string;
  lat: number;
  lng: number;
  type_id: number;
  type_name: string;
  specialty_ids?: number[];
  specialties?: string;
  originalIndex?: number; // Add this to support preserving original indices
  [key: string]: any; // For any other properties
}

interface MapPageClientProps {
  places: Place[];
  placeTypes: PlaceType[];
}

// Helper function to compare arrays (for dependency checks)
function arrayEquals(a: any[], b: any[]) {
  return a.length === b.length && 
         a.every((val, index) => val === b[index]);
}

export default function MapPageClient({ places, placeTypes }: MapPageClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  
  // Debug URL parameters
  console.log('DEBUG: Initial URL parameters:', {
    url: typeof window !== 'undefined' ? window.location.href : 'server-side',
    searchParams: searchParams ? Array.from(searchParams.entries()) : [],
    hasSpecialties: searchParams?.has('specialties'),
    hasSingleSpecialty: searchParams?.has('specialty')
  });
  
  // Specialty name-to-id resolution state
  const [specialtyNameMap, setSpecialtyNameMap] = useState<Record<string, number>>({});
  const [pendingSpecialtyName, setPendingSpecialtyName] = useState<string | null>(null);
  
  // IMPORTANT DEBUG: Check places data initial structure and build specialty name map for specialty_ids
  console.log('DEBUG: Places data initial structure:', {
    totalPlaces: places.length,
    placesWithSpecialtyIds: places.filter(p => Array.isArray(p.specialty_ids) && p.specialty_ids.length > 0).length,
    samplePlace: places.length > 0 ? places[0] : null,
    alanDay: places.find(p => p.name === 'Alan Day')
  });
  
  // Check URL params for debugging
  const urlSpecialties = searchParams?.get('specialties');
  if (urlSpecialties) {
    console.log('DEBUG: URL has specialties param:', urlSpecialties);
  }
  
  // Get the type filters from the URL if present
  const getInitialSelectedTypeIds = (): number[] => {
    if (searchParams) {
      const typeParams = searchParams.getAll('type');
      if (typeParams.length > 0) {
        return typeParams.map(t => parseInt(t)).filter(t => !isNaN(t));
      }
      
      // For backward compatibility with single type filter
      const singleType = searchParams.get('type');
      if (singleType) {
        const typeId = parseInt(singleType);
        return isNaN(typeId) ? [] : [typeId];
      }
    }
    return [];
  };
  
  // Get the specialty filters from the URL if present
  const getInitialSelectedSpecialtyIds = (): number[] => {
    if (!searchParams) {
      console.log('DEBUG: No search params available');
      return [];
    }
    
    console.log('DEBUG: Checking URL for specialty parameters...', {
      url: window?.location?.href,
      searchParams: Array.from(searchParams.entries()),
      raw: searchParams.toString()
    });
    
    // First check for plural 'specialties' parameter (API expects this)
    const specialtiesParam = searchParams.get('specialties');
    console.log('DEBUG: specialtiesParam value:', specialtiesParam);
    
    if (specialtiesParam) {
      console.log('DEBUG: Found specialties param in URL:', specialtiesParam);
      
      // Handle comma-separated values
      const specialtyValues = specialtiesParam.split(',');
      const specialtyIds = specialtyValues.map(v => {
        // Try to parse as number first
        const id = parseInt(v);
        if (!isNaN(id)) return id;
        
        // If it's not a number, it might be a name - store it for resolution later
        if (v && v.trim()) {
          setPendingSpecialtyName(v.trim());
        }
        return null;
      }).filter((id): id is number => id !== null);
      
      if (specialtyIds.length > 0) {
        console.log('DEBUG: Parsed specialty IDs from URL:', specialtyIds);
        return specialtyIds;
      }
    }
    
    // Check for individual 'specialty' param (hyperlinks might use this)
    const singleSpecialtyParam = searchParams.get('specialty');
    if (singleSpecialtyParam) {
      console.log('DEBUG: Found single specialty param in URL:', singleSpecialtyParam);
      
      // Try to parse as number first
      const specialtyId = parseInt(singleSpecialtyParam);
      if (!isNaN(specialtyId)) {
        console.log('DEBUG: Parsed single specialty ID from URL:', specialtyId);
        
        // IMPORTANT: Convert 'specialty' param to 'specialties' format in URL to maintain consistency
        // This fixes the hyperlink param bug by standardizing all specialty filtering on 'specialties'
        const newParams = new URLSearchParams(searchParams.toString());
        newParams.delete('specialty');
        newParams.set('specialties', specialtyId.toString());
        
        // Replace URL without causing a navigation (scroll: false)
        router.replace(`${pathname}?${newParams.toString()}`, { scroll: false });
        console.log('DEBUG: Standardized URL parameter from specialty to specialties');
        
        return [specialtyId];
      } else {
        // If it's not a number, it might be a name - store it for resolution later
        setPendingSpecialtyName(singleSpecialtyParam);
      }
    }
    
    // If we got here, either there are no specialty params, or they couldn't be parsed as IDs
    return [];
  };
  
  // Note: State for specialty name mapping is defined at the top of the component

  // Define filter state interface and actions for the reducer pattern
  interface FilterState {
    selectedTypeIds: number[];
    selectedSpecialtyIds: number[];
    filteredPlaces: Place[];
    visiblePlaces: Place[];
    mapBounds: any | null;
    hoveredPlaceIndex: number | null;
    selectedPlaceIndex: number | null;
    isInitialized: boolean;
    isUpdatingFromUrl: boolean;
    isClearing: boolean;
  }

  // Define action types for the filter reducer
  type FilterAction =
    | { type: 'INITIALIZE_FROM_URL'; typeIds: number[]; specialtyIds: number[] }
    | { type: 'SET_TYPE_FILTERS'; typeIds: number[] }
    | { type: 'SET_SPECIALTY_FILTERS'; specialtyIds: number[] }
    | { type: 'SET_FILTERED_PLACES'; places: Place[] }
    | { type: 'SET_VISIBLE_PLACES'; places: Place[] }
    | { type: 'SET_MAP_BOUNDS'; bounds: any }
    | { type: 'SET_HOVERED_PLACE'; index: number | null }
    | { type: 'SET_SELECTED_PLACE'; index: number | null }
    | { type: 'CLEAR_FILTERS' }
    | { type: 'SET_IS_UPDATING_FROM_URL'; isUpdating: boolean }
    | { type: 'COMPLETE_INITIALIZATION' };

  // Create filter reducer function
  const filterReducer = (state: FilterState, action: FilterAction): FilterState => {
    console.log('Filter reducer action:', action.type, action);
    
    switch (action.type) {
      case 'INITIALIZE_FROM_URL':
        return {
          ...state,
          selectedTypeIds: action.typeIds,
          selectedSpecialtyIds: action.specialtyIds,
          isUpdatingFromUrl: true
        };
      
      case 'SET_TYPE_FILTERS':
        // Only update if the values are actually different (prevents loops)
        if (arrayEquals(state.selectedTypeIds, action.typeIds)) {
          return state;
        }
        return {
          ...state,
          selectedTypeIds: action.typeIds,
          selectedPlaceIndex: null // Reset selection when filters change
        };
      
      case 'SET_SPECIALTY_FILTERS':
        // Only update if the values are actually different (prevents loops)
        if (arrayEquals(state.selectedSpecialtyIds, action.specialtyIds)) {
          return state;
        }
        return {
          ...state,
          selectedSpecialtyIds: action.specialtyIds,
          selectedPlaceIndex: null // Reset selection when filters change
        };
      
      case 'SET_FILTERED_PLACES':
        return { ...state, filteredPlaces: action.places };
      
      case 'SET_VISIBLE_PLACES':
        return { ...state, visiblePlaces: action.places };
      
      case 'SET_MAP_BOUNDS':
        return { ...state, mapBounds: action.bounds };
      
      case 'SET_HOVERED_PLACE':
        return { ...state, hoveredPlaceIndex: action.index };
      
      case 'SET_SELECTED_PLACE':
        return { ...state, selectedPlaceIndex: action.index };
      
      case 'CLEAR_FILTERS':
        return {
          ...state,
          selectedTypeIds: [],
          selectedSpecialtyIds: [],
          isClearing: true,
          selectedPlaceIndex: null
        };
      
      case 'SET_IS_UPDATING_FROM_URL':
        return { ...state, isUpdatingFromUrl: action.isUpdating };
      
      case 'COMPLETE_INITIALIZATION':
        return { ...state, isInitialized: true, isUpdatingFromUrl: false };
      
      default:
        return state;
    }
  };

  // Initialize the reducer state from URL params
  const initialSelectedTypeIds = getInitialSelectedTypeIds();
  const initialSelectedSpecialtyIds = getInitialSelectedSpecialtyIds();
  
  // Add debug log to track specialty filter initialization
  console.log('DEBUG: Initial specialty filter state:', {
    initialSelectedSpecialtyIds,
    fromUrl: true,
    urlParams: searchParams?.toString() || 'none'
  });
  
  // Create initial filter state
  const initialFilterState: FilterState = {
    selectedTypeIds: initialSelectedTypeIds,
    selectedSpecialtyIds: initialSelectedSpecialtyIds,
    filteredPlaces: [...places].map((p, i) => ({ ...p, originalIndex: i })),  // Add original index
    visiblePlaces: [...places].map((p, i) => ({ ...p, originalIndex: i })),  // Add original index
    mapBounds: null,
    hoveredPlaceIndex: null,
    selectedPlaceIndex: null,
    isInitialized: false,

  // Handle comma-separated values
  const specialtyValues = specialtiesParam.split(',');
  const specialtyIds = specialtyValues.map(v => {
    // Try to parse as number first
    const id = parseInt(v);
    if (!isNaN(id)) return id;

    // If it's not a number, it might be a name - store it for resolution later
    if (v && v.trim()) {
      setPendingSpecialtyName(v.trim());
    }
    return null;
  }).filter((id): id is number => id !== null);

  if (specialtyIds.length > 0) {
    console.log('DEBUG: Parsed specialty IDs from URL:', specialtyIds);
    return specialtyIds;
  }
}

// Check for individual 'specialty' param (hyperlinks might use this)
const singleSpecialtyParam = searchParams.get('specialty');
if (singleSpecialtyParam) {
  console.log('DEBUG: Found single specialty param in URL:', singleSpecialtyParam);

  // Try to parse as number first
  const specialtyId = parseInt(singleSpecialtyParam);
  if (!isNaN(specialtyId)) {
    console.log('DEBUG: Parsed single specialty ID from URL:', specialtyId);

    // IMPORTANT: Convert 'specialty' param to 'specialties' format in URL to maintain consistency
    // This fixes the hyperlink param bug by standardizing all specialty filtering on 'specialties'
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.delete('specialty');
    newParams.set('specialties', specialtyId.toString());

    // Replace URL without causing a navigation (scroll: false)
    router.replace(`${pathname}?${newParams.toString()}`, { scroll: false });
    console.log('DEBUG: Standardized URL parameter from specialty to specialties');

    return [specialtyId];
  } else {
    // If it's not a number, it might be a name - store it for resolution later
    setPendingSpecialtyName(singleSpecialtyParam);
  }
}

// If we got here, either there are no specialty params, or they couldn't be parsed as IDs
return [];
};

// Note: State for specialty name mapping is defined at the top of the component

// Define filter state interface and actions for the reducer pattern
interface FilterState {
  selectedTypeIds: number[];
  selectedSpecialtyIds: number[];
  filteredPlaces: Place[];
  visiblePlaces: Place[];
  mapBounds: any | null;
  hoveredPlaceIndex: number | null;
  selectedPlaceIndex: number | null;
  isInitialized: boolean;
  isUpdatingFromUrl: boolean;
  isClearing: boolean;
}

// Define action types for the filter reducer
type FilterAction =
  | { type: 'INITIALIZE_FROM_URL'; typeIds: number[]; specialtyIds: number[] }
  | { type: 'SET_TYPE_FILTERS'; typeIds: number[] }
  | { type: 'SET_SPECIALTY_FILTERS'; specialtyIds: number[] }
  | { type: 'SET_FILTERED_PLACES'; places: Place[] }
  | { type: 'SET_VISIBLE_PLACES'; places: Place[] }
  | { type: 'SET_MAP_BOUNDS'; bounds: any }
  | { type: 'SET_HOVERED_PLACE'; index: number | null }
  | { type: 'SET_SELECTED_PLACE'; index: number | null }
  | { type: 'CLEAR_FILTERS' }
  | { type: 'SET_IS_UPDATING_FROM_URL'; isUpdating: boolean }
  | { type: 'COMPLETE_INITIALIZATION' };

// Create filter reducer function
const filterReducer = (state: FilterState, action: FilterAction): FilterState => {
  console.log('Filter reducer action:', action.type, action);

  switch (action.type) {
    case 'INITIALIZE_FROM_URL':
      return {
        ...state,
        selectedTypeIds: action.typeIds,
        selectedSpecialtyIds: action.specialtyIds,
        isUpdatingFromUrl: true
      };

    case 'SET_TYPE_FILTERS':
      // Only update if the values are actually different (prevents loops)
      if (arrayEquals(state.selectedTypeIds, action.typeIds)) {
        return state;
      }
      return {
        ...state,
        selectedTypeIds: action.typeIds,
        selectedPlaceIndex: null // Reset selection when filters change
      };

    case 'SET_SPECIALTY_FILTERS':
      // Only update if the values are actually different (prevents loops)
      if (arrayEquals(state.selectedSpecialtyIds, action.specialtyIds)) {
        return state;
      }
      return {
        ...state,
        selectedSpecialtyIds: action.specialtyIds,
        selectedPlaceIndex: null // Reset selection when filters change
      };

    case 'SET_FILTERED_PLACES':
      return { ...state, filteredPlaces: action.places };

    case 'SET_VISIBLE_PLACES':
      return { ...state, visiblePlaces: action.places };

    case 'SET_MAP_BOUNDS':
      return { ...state, mapBounds: action.bounds };

    case 'SET_HOVERED_PLACE':
      return { ...state, hoveredPlaceIndex: action.index };

    case 'SET_SELECTED_PLACE':
      return { ...state, selectedPlaceIndex: action.index };

    case 'CLEAR_FILTERS':
      return {
        ...state,
        selectedTypeIds: [],
        selectedSpecialtyIds: [],
        isClearing: true,
        selectedPlaceIndex: null
      };

    case 'SET_IS_UPDATING_FROM_URL':
      return { ...state, isUpdatingFromUrl: action.isUpdating };

    case 'COMPLETE_INITIALIZATION':
      return { ...state, isInitialized: true, isUpdatingFromUrl: false };

    default:
      return state;
  }
};

// Initialize the reducer state from URL params
const initialSelectedTypeIds = getInitialSelectedTypeIds();
const initialSelectedSpecialtyIds = getInitialSelectedSpecialtyIds();

// Create initial filter state
const initialFilterState: FilterState = {
  selectedTypeIds: initialSelectedTypeIds,
  selectedSpecialtyIds: initialSelectedSpecialtyIds,
  filteredPlaces: [],
  visiblePlaces: [],
  mapBounds: null,
  hoveredPlaceIndex: null,
  selectedPlaceIndex: null,
  isInitialized: false,
  isUpdatingFromUrl: false,
  isClearing: false
};

// Debug initial values
console.log('DEBUG: Initial filter state', {
  typeIds: initialFilterState.selectedTypeIds,
  specialtyIds: initialFilterState.selectedSpecialtyIds,
  urlSpecialties: searchParams?.get('specialties') || 'none'
});

// Use the reducer for state management
const [state, dispatch] = useReducer(filterReducer, initialFilterState);

// Extract state properties
const {
  selectedTypeIds,
  selectedSpecialtyIds,
  filteredPlaces,
  visiblePlaces,
  mapBounds,
  hoveredPlaceIndex,
  selectedPlaceIndex,
  isInitialized,
  isUpdatingFromUrl,
  isClearing
} = state;

// Fetch specialties data to resolve pending specialty names to IDs
useEffect(() => {
  if (pendingSpecialtyName) {
    console.log('DEBUG: Attempting to resolve specialty name:', pendingSpecialtyName);

    fetch('/api/specialties')
      .then(res => res.json())
      .then(data => {
        const specialties = data.specialties || [];

        // Build a map of name -> id for quick lookup
        const nameMap: Record<string, number> = {};
        specialties.forEach((specialty: any) => {
          // Store both normalized (lowercase) and original name for flexible matching
          if (specialty.name) {
            nameMap[specialty.name.toLowerCase()] = specialty.id;
            nameMap[specialty.name] = specialty.id;

            // Also add subcategories to the map if they exist
            if (specialty.subcategories && Array.isArray(specialty.subcategories)) {
              specialty.subcategories.forEach((sub: any) => {
                if (sub.name) {
                  nameMap[sub.name.toLowerCase()] = sub.id;
                  nameMap[sub.name] = sub.id;
                }
              });
            }
          }
        });

        setSpecialtyNameMap(nameMap);

        // Try to match the pending name against our map
        const normalizedName = pendingSpecialtyName.toLowerCase();
        const matchedId = nameMap[normalizedName] || nameMap[pendingSpecialtyName];

        if (matchedId) {
          console.log(`DEBUG: Resolved specialty name "${pendingSpecialtyName}" to ID:`, matchedId);

          // Update selected specialty IDs with the resolved ID
          dispatch({
            type: 'SET_SPECIALTY_FILTERS',
            specialtyIds: [...selectedSpecialtyIds, matchedId]
          });
        } else {
          console.warn(`DEBUG: Could not resolve specialty name "${pendingSpecialtyName}" to an ID`);
        }

        // Clear the pending name so we don't keep trying to resolve it
        setPendingSpecialtyName(null);
      })
      .catch(err => {
        console.error('Error fetching specialties to resolve name:', err);
        setPendingSpecialtyName(null);
      });
  }
}, [pendingSpecialtyName, selectedSpecialtyIds, dispatch]);

// Sync state with URL when URL changes
useEffect(() => {
  const params = searchParams;
  // Skip processing if clearing filters or if not initialized
  if (isClearing || !isInitialized || isUpdatingFromUrl) {
    return;
  }
  
  console.log('DEBUG: URL changed, syncing state with URL params', {
    urlParams: params?.toString() || 'none'
  });

  // Get filters from URL
  const typeIds = getInitialSelectedTypeIds();
  const specialtyIds = getInitialSelectedSpecialtyIds();
  
  // Debug specialty parameter presence
  const specialtiesParam = params?.get('specialties');
  const singleSpecialtyParam = params?.get('specialty');
  console.log('DEBUG: Specialty params in URL:', {
    specialtiesParam,
    singleSpecialtyParam,
    specialtyIds
  });

  console.log('DEBUG: Filters from URL', {
    typeIds,
    specialtyIds
  });

  // If current state doesn't match URL, update it
  const typesEqual = arrayEquals(selectedTypeIds, typeIds);
  const specialtiesEqual = arrayEquals(selectedSpecialtyIds, specialtyIds);

  if (!typesEqual || !specialtiesEqual) {
    console.log('DEBUG: State does not match URL, updating state', {
      currentTypes: selectedTypeIds,
      urlTypes: typeIds,
      typesEqual,
      currentSpecialties: selectedSpecialtyIds,
      urlSpecialties: specialtyIds,
      specialtiesEqual
    });

    // Use dispatch to update state from URL
    dispatch({ 
      type: 'INITIALIZE_FROM_URL', 
      typeIds, 
      specialtyIds 
    });
  }
}, [searchParams, pathname, isClearing, isUpdatingFromUrl, dispatch]);

// Apply filters effect using reducer - now fetches from API for specialty filters
useEffect(() => {
  // Debug filter effect trigger
  const params = searchParams;
  console.log('DEBUG: Filter effect triggered. Initial conditions:', { 
    isClearing,
    selectedTypeIds, 
    selectedSpecialtyIds, 
    placesCount: places.length,
    isInitialized,
    isUpdatingFromUrl,
    urlSpecialties: params?.get('specialties') || 'none',
    urlSpecialty: params?.get('specialty') || 'none'
  });
  
  // Skip processing if clearing filters
  if (isClearing) {
    console.log('DEBUG: Skipping filter effect - clearing filters');
    return;
  }
  
  // Force specialtyIds to include the individual 'specialty' param if it exists and is not already included
  // This ensures that clicking specialty links works even if the URL hasn't been updated to use 'specialties' plural
  const singleSpecialtyParam = params?.get('specialty');
  let effectiveSpecialtyIds = [...selectedSpecialtyIds];
  
  if (singleSpecialtyParam) {
    // Try to parse as number
    const singleSpecialtyId = parseInt(singleSpecialtyParam);
    if (!isNaN(singleSpecialtyId) && !effectiveSpecialtyIds.includes(singleSpecialtyId)) {
      console.log('DEBUG: Adding single specialty param to filter:', singleSpecialtyId);
      effectiveSpecialtyIds.push(singleSpecialtyId);
    }
  }
  
  console.log('DEBUG: Filter effect proceeding with:', { 
    selectedTypeIds, 
    effectiveSpecialtyIds, 
    placesCount: places.length 
  });

  // Build API query parameters based on selected filters
  const fetchFilteredPlaces = async () => {
    try {
      // Create query string for API request
      let queryParams = new URLSearchParams();
      
      // Add type filters if any are selected
      if (selectedTypeIds.length > 0) {
        queryParams.append('types', selectedTypeIds.join(','));
      }
      
      // Add specialty filters if any are selected
      if (effectiveSpecialtyIds.length > 0) {
        queryParams.set('specialties', effectiveSpecialtyIds.join(','));
        console.log('DEBUG: Adding specialty filters to API request:', effectiveSpecialtyIds.join(','));
      }
      
      // Construct API URL
      const apiUrl = `/api/places${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      console.log('DEBUG: Fetching from API:', apiUrl);
      
      // Make API request
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }
      
      // Parse response
      const filteredData = await response.json();
      console.log('DEBUG: API response:', { 
        count: filteredData.length,
        sampleData: filteredData.slice(0, 3)
      });
      
      // Add originalIndex to each place to preserve marker numbering
      const placesWithIndex = filteredData.map((place: Place, index: number) => ({
        ...place,
        originalIndex: index
      }));
      
      // Debug Alan Day specifically if present
      const alanDay = placesWithIndex.find((p: Place) => p.name === 'Alan Day');
      if (alanDay) {
        console.log('DEBUG: Alan Day in API results:', {
          has_specialty_ids: !!alanDay.specialty_ids,
          specialty_ids: alanDay.specialty_ids || [],
          specialties: alanDay.specialties
        });
      } else if (selectedSpecialtyIds.includes(4)) {
        console.error('ERROR: Alan Day not found in API results despite specialty ID 4 selected');
      }
      
      // Update filtered places through reducer action
      dispatch({ type: 'SET_FILTERED_PLACES', places: placesWithIndex });
      
      // If we have map bounds, also update visible places
      if (mapBounds) {
        updateVisiblePlaces(placesWithIndex, mapBounds);
      } else {
        // If no bounds, all filtered places are visible
        dispatch({ type: 'SET_VISIBLE_PLACES', places: placesWithIndex });
      }
    } catch (error) {
      console.error('Error fetching filtered places:', error);
      
      // Fallback to original places if API fails
      const placesWithIndex = places.map((place, index) => ({
        ...place,
        originalIndex: index
      }));
      dispatch({ type: 'SET_FILTERED_PLACES', places: placesWithIndex });
      dispatch({ type: 'SET_VISIBLE_PLACES', places: placesWithIndex });
    }
  };
  
  // Execute the async function
  fetchFilteredPlaces();
}, [selectedTypeIds, selectedSpecialtyIds, places, mapBounds, isClearing, dispatch, updateVisiblePlaces]);

// Debug specialty filter passing to component
useEffect(() => {
  console.log('DEBUG: HierarchicalSpecialtyFilter should receive these selectedIds:', selectedSpecialtyIds);
}, [selectedSpecialtyIds]);

// Handle empty results
useEffect(() => {
  if (filteredPlaces.length === 0 && places.length > 0 && 
      (selectedTypeIds.length > 0 || selectedSpecialtyIds.length > 0) && !isClearing) {
    console.log('WARNING: Filters resulted in zero places - displaying warning');
    // We don't auto-clear anymore to prevent loops
  }
}, [filteredPlaces, places, selectedTypeIds, selectedSpecialtyIds, isClearing]);

// Handle when marker click returns null (info panel closed)
const handleMarkerClick = (index: number | null) => {
  // When index is null, we're closing the info panel
  if (index === null) {
    // Clear both selected and hovered states
    dispatch({ type: 'SET_SELECTED_PLACE', index: null });
    dispatch({ type: 'SET_HOVERED_PLACE', index: null });
  } else {
    // Otherwise, select the place
    dispatch({ type: 'SET_SELECTED_PLACE', index });
  }
};
  
  // Skip excessive logging that might cause performance issues

  return (
    <>
      {/* Two column layout for desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar with filters and categories */}
        <div className="lg:col-span-1">
          {/* Category Legend */}
          <div className="mb-4">
            <MapCategoryLegend
              placeTypes={placeTypes}
              selectedTypeIds={selectedTypeIds}
              onTypeClick={handleTypeFilterChange}
              onClearFilters={handleClearFilters}
            />
          </div>
          
          {/* Specialty Filter */}
          <div className="mb-6 bg-white p-4 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-2">Specialties</h3>
            {/* Debug Info */}
            <div className="text-xs text-gray-500 mb-2">
              DEBUG: Selected IDs: {JSON.stringify(selectedSpecialtyIds)}
            </div>
            <HierarchicalSpecialtyFilter
              onChange={handleSpecialtyFilterChange}
              initialSelectedIds={selectedSpecialtyIds}
              mode="advanced"
            />
          </div>
          
          {/* Statistics panel */}
          <div className="bg-white p-4 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-2">Map Stats</h3>
            <p className="text-sm text-gray-600 mb-1">
              <strong>Total Places:</strong> {places.length}
            </p>
            <p className="text-sm text-gray-600 mb-1">
              <strong>Filtered Places:</strong> {filteredPlaces.length}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Visible on Map:</strong> {visiblePlaces.length}
            </p>
          </div>
        </div>
        
        {/* Map area */}
        <div className="lg:col-span-3">
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <div className="relative z-0 rounded-lg overflow-hidden" style={{ height: '70vh' }}>
              {/* The map component */}
              <div className="h-full w-full">
                {/* Use React key and ref to prevent unnecessary remounting and maintain instance stability */}
                <BasicMapComponent
                  // Remove key dependency on filteredPlaces to prevent remounting
                  // key={`map-instance-${filteredPlaces.length}`}
                  places={filteredPlaces}
                  centerLat={mapCenter?.lat ?? defaultMapCenter.lat}
                  centerLng={mapCenter?.lng ?? defaultMapCenter.lng}
                  zoom={mapZoom}
                  onBoundsChange={handleBoundsChange}
                  showNumberedMarkers={true}
                  onMarkerHover={setHoveredPlaceIndex}
                  onMarkerLeave={() => setHoveredPlaceIndex(null)}
                  onMarkerClick={handleMarkerClick}
                  highlightedIndex={hoveredPlaceIndex}
                  selectedPlaceIndex={selectedPlaceIndex}
                />
              </div>
            </div>
          </div>
          
          {/* List of visible places below the map */}
          <div className="mt-6 bg-white rounded-lg shadow-md p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-lg">
                {visiblePlaces.length} {visiblePlaces.length === 1 ? 'Place' : 'Places'} 
                {(selectedTypeIds.length > 0 || selectedSpecialtyIds.length > 0) && (
                  <span>
                    {selectedTypeIds.length > 0 && 
                      ` (${selectedTypeIds.length} ${selectedTypeIds.length === 1 ? 'Category' : 'Categories'})`}
                    {selectedSpecialtyIds.length > 0 && 
                      ` (${selectedSpecialtyIds.length} ${selectedSpecialtyIds.length === 1 ? 'Specialty' : 'Specialties'})`}
                  </span>
                )}
                {mapBounds && ` in Current View`}
              </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {visiblePlaces.map((place) => {
                // Use originalIndex if available, otherwise fall back to the index in the filtered array
                const displayIndex = place.originalIndex; // Use originalIndex directly
                
                // Determine if this place is selected or hovered
                const isSelected = selectedPlaceIndex === displayIndex;
                const isHovered = hoveredPlaceIndex === displayIndex;
                
                // Get category color for border highlighting
                const categoryColor = typeColors[place.type_id] || '#AAAAAA';
                
                return (
                  <div 
                    key={place.id} 
                    className={`p-3 rounded-md transition-all cursor-pointer border-2 ${                  
                      !isSelected && !isHovered ? 'border-transparent' : ''
                    }`}
                    style={{
                      borderColor: isSelected || isHovered ? categoryColor : 'transparent',
                      backgroundColor: isHovered && !isSelected ? 'rgba(243, 244, 246, 0.5)' : 'white'
                    }}
                    onMouseEnter={() => setHoveredPlaceIndex(typeof displayIndex === 'number' ? displayIndex : null)}
                    onMouseLeave={() => setHoveredPlaceIndex(null)}
                    onClick={() => handlePlaceClick(typeof displayIndex === 'number' ? displayIndex : null)}
                  >
                    <div className="flex items-start space-x-3">
                      <div 
                        className={`flex-shrink-0 w-8 h-8 text-white rounded-full flex items-center justify-center font-bold`}
                        style={{ backgroundColor: typeColors[place.type_id] || '#AAAAAA' }}
                        title={`${place.type_name}`}
                      >
                        {typeof displayIndex === 'number' ? displayIndex + 1 : '?'}
                      </div>
                      <div>
                        <h4 className="font-semibold">{place.name}</h4>
                        <p className="text-sm text-gray-500 truncate">{place.address}</p>
                        <p className="text-xs mt-1">{place.type_name}</p>
                        {place.specialties && (
                          <p className="text-xs text-gray-600">{place.specialties}</p>
                        )}
                        <Link 
                          href={`/places/${place.id}`} 
                          className="text-xs text-edinburgh-blue hover:underline mt-2 inline-block"
                        >
                          View Details
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {visiblePlaces.length === 0 && (
              <div className="text-center py-6 text-gray-500">
                No places found with the current filters and map view.
                {(selectedTypeIds.length > 0 || selectedSpecialtyIds.length > 0) && (
                  <button 
                    className="block mx-auto mt-2 text-edinburgh-blue hover:underline"
                    onClick={handleClearFilters}
                  >
                    Clear All Filters
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

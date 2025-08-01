'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import FormattedOpeningHours from './FormattedOpeningHours';
import SimpleSpecialtyFilter from './SimpleSpecialtyFilter';

interface PlaceType {
  id: number;
  name: string;
}

interface Place {
  id: number;
  name: string;
  address: string;
  description: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  specialties: string | null;
  opening_hours: string | null;
  lat: number;
  lng: number;
  type_id: number;
  type_name: string;
  price_range: string | null;
}

interface PlacesFiltersProps {
  initialPlaces: Place[];
  placeTypes: PlaceType[];
}

export default function PlacesFilters({ initialPlaces, placeTypes }: PlacesFiltersProps) {
  // State for filtered places
  const [places, setPlaces] = useState<Place[]>(initialPlaces);
  const [isLoading, setIsLoading] = useState(false);
  
  // State for filter values
  const [typeId, setTypeId] = useState<number | undefined>(undefined);
  const [priceRange, setPriceRange] = useState<string | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [specialtyIds, setSpecialtyIds] = useState<number[]>([]);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Initialize filters from URL
  useEffect(() => {
    if (!searchParams) return;
    
    // Get filter values from URL
    const typeParam = searchParams.get('type');
    const priceParam = searchParams.get('price');
    const searchParam = searchParams.get('search');
    const specialtiesParam = searchParams.get('specialties');
    
    // Set state based on URL params
    if (typeParam) {
      setTypeId(parseInt(typeParam, 10));
    }
    
    if (priceParam) {
      setPriceRange(priceParam);
    }
    
    if (searchParam) {
      setSearchTerm(searchParam);
    }
    
    if (specialtiesParam) {
      const ids = specialtiesParam.split(',').map(id => parseInt(id, 10));
      setSpecialtyIds(ids);
    }
  }, [searchParams]);
  
  // Function to update URL params
  const updateUrlParams = useCallback((params: Record<string, string | null>) => {
    const newParams = new URLSearchParams(searchParams?.toString() || '');
    
    // Update or delete each parameter
    Object.entries(params).forEach(([key, value]) => {
      if (value === null) {
        newParams.delete(key);
      } else {
        newParams.set(key, value);
      }
    });
    
    // Update URL without navigation
    const newUrl = `${window.location.pathname}?${newParams.toString()}`;
    window.history.replaceState({}, '', newUrl);
  }, [searchParams]);
  
  // Fetch places based on filters
  const fetchPlaces = useCallback(async () => {
    setIsLoading(true);
    
    try {
      // Build query string
      const params = new URLSearchParams();
      if (typeId) params.set('type_id', typeId.toString());
      if (priceRange) params.set('price_range', priceRange);
      if (searchTerm) params.set('search', searchTerm);
      if (specialtyIds.length > 0) params.set('specialties', specialtyIds.join(','));
      
      // Add a minimum delay to ensure smooth UI
      const startTime = Date.now();
      const minDelay = 600; // milliseconds
      
      // Fetch data
      const response = await fetch(`/api/places?${params.toString()}`);
      
      // Handle response
      if (!response.ok) {
        throw new Error('Failed to fetch places');
      }
      
      const data = await response.json();
      
      // Calculate elapsed time
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minDelay - elapsed);
      
      // Set state after minimum delay
      setTimeout(() => {
        setPlaces(data);
        setIsLoading(false);
      }, remaining);
    } catch (error) {
      console.error('Error fetching places:', error);
      
      // Fall back to client-side filtering
      const filtered = filterPlacesLocally();
      
      // Ensure minimum loading time
      setTimeout(() => {
        setPlaces(filtered);
        setIsLoading(false);
      }, 400);
    }
  }, [typeId, priceRange, searchTerm, specialtyIds]);
  
  // Client-side filtering as fallback
  const filterPlacesLocally = useCallback(() => {
    let result = initialPlaces;
    
    // Filter by type
    if (typeId) {
      result = result.filter(place => place.type_id === typeId);
    }
    
    // Filter by price
    if (priceRange) {
      result = result.filter(place => place.price_range === priceRange);
    }
    
    // Filter by search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(place => 
        place.name.toLowerCase().includes(term) ||
        (place.description && place.description.toLowerCase().includes(term)) ||
        place.address.toLowerCase().includes(term)
      );
    }
    
    // Filter by specialties (basic implementation)
    if (specialtyIds.length > 0) {
      result = result.filter(place => {
        if (!place.specialties) return false;
        
        // Simple check if specialty IDs are mentioned in the specialties text
        // This is a temporary solution until we have proper specialty relationships
        return specialtyIds.every(id => 
          place.specialties?.includes(id.toString()) || false
        );
      });
    }
    
    return result;
  }, [initialPlaces, typeId, priceRange, searchTerm, specialtyIds]);
  
  // Apply filters when any filter changes
  useEffect(() => {
    fetchPlaces();
    
    // Update URL
    updateUrlParams({
      type: typeId ? typeId.toString() : null,
      price: priceRange || null,
      search: searchTerm || null,
      specialties: specialtyIds.length > 0 ? specialtyIds.join(',') : null
    });
  }, [typeId, priceRange, searchTerm, specialtyIds, fetchPlaces, updateUrlParams]);
  
  // Handle form submission for search
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // No need to do anything here since the effect will trigger
  };
  
  // Handle specialty filter changes
  const handleSpecialtyChange = (ids: number[]) => {
    setSpecialtyIds(ids);
  };
  
  // Clear all filters
  const clearAllFilters = () => {
    setTypeId(undefined);
    setPriceRange(undefined);
    setSearchTerm('');
    setSpecialtyIds([]);
    updateUrlParams({ type: null, price: null, search: null, specialties: null });
    setPlaces(initialPlaces);
  };
  
  // Determine if any filters are applied
  const hasActiveFilters = typeId !== undefined || priceRange !== undefined || searchTerm !== '' || specialtyIds.length > 0;
  
  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-lg shadow space-y-4">
        <form onSubmit={handleSearchSubmit} className="space-y-4">
          <div>
            <label htmlFor="searchTerm" className="form-label">Search</label>
            <div className="flex">
              <input 
                type="text"
                id="searchTerm"
                className="input rounded-r-none flex-grow"
                placeholder="Search by name, address, or keywords..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button 
                type="submit"
                className="px-4 py-2 bg-edinburgh-blue text-white rounded-r-md hover:bg-opacity-90"
              >
                Search
              </button>
            </div>
          </div>
          
          <div>
            <label htmlFor="typeFilter" className="form-label">Filter by Category</label>
            <select 
              id="typeFilter"
              className="input"
              value={typeId || ''}
              onChange={(e) => setTypeId(e.target.value ? parseInt(e.target.value, 10) : undefined)}
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
              value={priceRange || ''}
              onChange={(e) => setPriceRange(e.target.value || undefined)}
            >
              <option value="">All Price Ranges</option>
              <option value="£">£ (Budget)</option>
              <option value="££">££ (Mid-range)</option>
              <option value="£££">£££ (High-end)</option>
              <option value="££££">££££ (Luxury)</option>
            </select>
          </div>
        </form>
      </div>
      
      {/* SimpleSpecialtyFilter component */}
      <SimpleSpecialtyFilter 
        typeId={typeId} 
        onChange={handleSpecialtyChange}
      />
      
      {/* Results header with stable rendering */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">
          {isLoading ? (
            <div className="animate-pulse h-7 bg-gray-200 rounded w-32"></div>
          ) : (
            <span>{places.length} {places.length === 1 ? 'Place' : 'Places'} Found</span>
          )}
        </h2>
        <Link href="/places/new" className="btn btn-primary">
          Add New Place
        </Link>
      </div>
      
      {/* Clear filters button */}
      {hasActiveFilters && (
        <div className="flex justify-end">
          <button
            onClick={clearAllFilters}
            className="text-sm text-edinburgh-blue hover:underline"
          >
            Clear All Filters
          </button>
        </div>
      )}
      
      {/* Places grid with stable height container */}
      <div className="min-h-[300px]">
        {!isLoading && places.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {places.map(place => (
              <Link key={place.id} href={`/places/${place.id}`} className="card hover:shadow-lg transition-shadow">
                <div className="flex justify-between">
                  <h3 className="font-semibold text-lg text-edinburgh-blue">{place.name}</h3>
                  <span className="bg-edinburgh-stone px-2 py-1 rounded-full text-xs">
                    {place.type_name}
                  </span>
                </div>
                {place.price_range && (
                  <p className="text-sm text-gray-500 mt-1">Price Range: {place.price_range}</p>
                )}
                <p className="text-sm mt-2">{place.address}</p>
                {place.specialties && (
                  <p className="text-sm mt-2 italic">
                    <span className="font-medium">Specialties:</span> {place.specialties}
                  </p>
                )}
                <FormattedOpeningHours 
                  placeId={place.id} 
                  fallbackText={place.opening_hours || ''}
                />
              </Link>
            ))}
          </div>
        )}
        
        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center h-[300px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-edinburgh-blue mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading places...</p>
            </div>
          </div>
        )}
        
        {/* Empty state - with key for stable rendering */}
        {!isLoading && places.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow" key="empty-state">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-xl font-medium text-gray-600 mt-4">No places found</h3>
            <p className="text-gray-500 mt-2">Try adjusting your filters or search terms</p>
          </div>
        )}
      </div>
    </div>
  );
}

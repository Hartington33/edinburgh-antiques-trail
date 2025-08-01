'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import FormattedOpeningHours from './FormattedOpeningHours';
import SpecialtyFilter from './SpecialtyFilter';

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

interface FilterState {
  type_id?: number;
  price_range?: string;
  search?: string;
  specialty_ids?: number[];
}

interface PlacesFiltersProps {
  initialPlaces: Place[];
  placeTypes: PlaceType[];
}

export default function PlacesFilters({ initialPlaces, placeTypes }: PlacesFiltersProps) {
  const [places, setPlaces] = useState<Place[]>(initialPlaces);
  const [filters, setFilters] = useState<FilterState>({});
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Function to fetch places based on filters
  const fetchPlaces = async (filterParams: FilterState) => {
    setIsLoading(true);
    
    try {
      // Build query parameters for the API request
      const params = new URLSearchParams();
      if (filterParams.type_id) params.set('type_id', filterParams.type_id.toString());
      if (filterParams.price_range) params.set('price_range', filterParams.price_range);
      if (filterParams.search) params.set('search', filterParams.search);
      if (filterParams.specialty_ids && filterParams.specialty_ids.length > 0) {
        params.set('specialties', filterParams.specialty_ids.join(','));
      }
      
      // Make API request
      const response = await fetch(`/api/places?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch places');
      
      const data = await response.json();
      setPlaces(data);
    } catch (error) {
      console.error('Error fetching places:', error);
      // Fallback to client-side filtering if API request fails
      filterPlacesClientSide(filterParams);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fallback client-side filtering function
  const filterPlacesClientSide = (filterParams: FilterState) => {
    let filteredPlaces = initialPlaces;
    
    if (filterParams.type_id) {
      filteredPlaces = filteredPlaces.filter(place => place.type_id === filterParams.type_id);
    }
    
    if (filterParams.price_range) {
      filteredPlaces = filteredPlaces.filter(place => place.price_range === filterParams.price_range);
    }
    
    if (filterParams.search) {
      const searchLower = filterParams.search.toLowerCase();
      filteredPlaces = filteredPlaces.filter(place => 
        place.name.toLowerCase().includes(searchLower) ||
        place.address.toLowerCase().includes(searchLower) ||
        (place.description && place.description.toLowerCase().includes(searchLower))
      );
    }
    
    // Filter by specialties if selected
    if (filterParams.specialty_ids && filterParams.specialty_ids.length > 0) {
      filteredPlaces = filteredPlaces.filter(place => {
        // Check if place has specialties
        if (!place.specialties) return false;
        
        // For now, we're just doing a simple string match on the comma-separated specialties
        // Later we'll enhance this to use the specialty_ids relationship
        const placeSpecialties = place.specialties.toLowerCase();
        
        // Check if all selected specialty IDs are present in the place's specialties
        return filterParams.specialty_ids!.every(id => {
          // This is a temporary implementation until we get the actual specialty data
          // In a real implementation, we'd check against the specialty_ids relationship
          return placeSpecialties.includes(id.toString());
        });
      });
    }
    
    setPlaces(filteredPlaces);
  };
  
  useEffect(() => {
    // Load filter parameters from URL if present
    const typeId = searchParams?.get('type');
    const priceRange = searchParams?.get('price');
    const search = searchParams?.get('search');
    const specialties = searchParams?.get('specialties');
    
    const initialFilters: FilterState = {};
    
    if (typeId) initialFilters.type_id = parseInt(typeId, 10);
    if (priceRange) initialFilters.price_range = priceRange;
    if (search) {
      initialFilters.search = search;
      setSearchTerm(search);
    }
    if (specialties) {
      const specialtyIds = specialties.split(',').map(id => parseInt(id, 10));
      initialFilters.specialty_ids = specialtyIds;
    }
    
    setFilters(initialFilters);
    
    // If we have any filters, apply them
    if (Object.keys(initialFilters).length > 0) {
      fetchPlaces(initialFilters);
    }
  }, [searchParams]);
  
  // Function to handle filter changes (for dropdowns)
  const handleFilterChange = (filterType: keyof FilterState, value: string) => {
    const updatedFilters = { ...filters };
    
    // If value is empty, remove the filter, otherwise set it
    if (value === '') {
      delete updatedFilters[filterType];
    } else if (filterType === 'type_id') {
      updatedFilters.type_id = parseInt(value, 10);
    } else if (filterType === 'price_range') {
      updatedFilters.price_range = value;
    }
    
    // Update component state
    setFilters(updatedFilters);
    
    // Update URL query params
    const params = new URLSearchParams(searchParams?.toString() || '');
    
    // Handle the specific filter types
    if (filterType === 'type_id') {
      if (value === '') {
        params.delete('type');
      } else {
        params.set('type', value);
      }
    } else if (filterType === 'price_range') {
      if (value === '') {
        params.delete('price');
      } else {
        params.set('price', value);
      }
    }
    
    // Update the URL and trigger data fetch
    router.push(`${window.location.pathname}?${params.toString()}`);
    fetchPlaces(updatedFilters);
  };
  
  // Function to handle search form submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    const updatedFilters = { ...filters };
    
    // If search term is empty, remove the search filter
    if (searchTerm.trim() === '') {
      delete updatedFilters.search;
    } else {
      updatedFilters.search = searchTerm.trim();
    }
    
    // Update component state
    setFilters(updatedFilters);
    
    // Update URL query params
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (searchTerm.trim() === '') {
      params.delete('search');
    } else {
      params.set('search', searchTerm.trim());
    }
    
    // Update the URL and fetch data with the new filters
    router.push(`${window.location.pathname}?${params.toString()}`);
    fetchPlaces(updatedFilters);
  };
  
  // Handle specialty filter changes
  const handleSpecialtyChange = (selectedIds: number[]) => {
    const updatedFilters = { ...filters };
    
    // If no specialties selected, remove the filter
    if (selectedIds.length === 0) {
      delete updatedFilters.specialty_ids;
    } else {
      updatedFilters.specialty_ids = selectedIds;
    }
    
    // Update component state
    setFilters(updatedFilters);
    
    // We don't need to update URL query params here as the SpecialtyFilter component does that
    
    // Fetch places with updated filters
    fetchPlaces(updatedFilters);
  };
  
  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-lg shadow space-y-4">
        <form onSubmit={handleSearch} className="space-y-4">
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
        </form>
      </div>
      
      {/* Specialty Filter */}
      <div className="bg-white p-4 rounded-lg shadow">
        <SpecialtyFilter 
          initialSelectedIds={filters.specialty_ids || []} 
          typeId={filters.type_id} 
          onChange={handleSpecialtyChange} 
        />
      </div>
      
      {/* Loading indicator */}
      {isLoading && (
        <div className="text-center py-4">
          <p className="text-gray-600">Loading places...</p>
        </div>
      )}
      
      {/* Results header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">
          {places.length} {places.length === 1 ? 'Place' : 'Places'} Found
        </h2>
        <Link href="/places/new" className="btn btn-primary">
          Add New Place
        </Link>
      </div>
      
      {/* Clear filters button */}
      {Object.keys(filters).length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={() => {
              setFilters({});
              setSearchTerm('');
              router.push(window.location.pathname);
              setPlaces(initialPlaces);
            }}
            className="text-sm text-edinburgh-blue hover:underline"
          >
            Clear All Filters
          </button>
        </div>
      )}
      
      {/* Places grid */}
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
            {/* Use FormattedOpeningHours to ensure consistent display with shop page */}
            <FormattedOpeningHours 
              placeId={place.id} 
              fallbackText={place.opening_hours || ''}
            />
          </Link>
        ))}
      </div>
      
      {/* Empty state */}
      {places.length === 0 && !isLoading && (
        <div className="text-center py-8">
          <h3 className="text-xl font-medium text-gray-600">No places found matching your criteria</h3>
          <p className="mt-2">Try adjusting your filters or search terms</p>
        </div>
      )}
    </div>
  );
}

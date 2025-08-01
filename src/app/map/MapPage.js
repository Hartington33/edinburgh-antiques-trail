'use client';

import { useState, useEffect } from 'react';
import SimpleMap from '@/components/SimpleMap';
import { formatTime, cleanOpeningHours } from '@/lib/client-format';

export default function MapPage({ initialPlaces, placeTypes }) {
  const [places, setPlaces] = useState(initialPlaces || []);
  const [filteredPlaces, setFilteredPlaces] = useState(initialPlaces || []);
  const [typeFilter, setTypeFilter] = useState('');
  const [priceFilter, setPriceFilter] = useState('');
  
  // Apply filters when they change
  useEffect(() => {
    let filtered = [...places];
    
    if (typeFilter) {
      filtered = filtered.filter(place => place.type_id.toString() === typeFilter);
    }
    
    if (priceFilter) {
      filtered = filtered.filter(place => place.price_range === priceFilter);
    }
    
    setFilteredPlaces(filtered);
  }, [places, typeFilter, priceFilter]);
  
  // Get unique price ranges for the filter
  const priceRanges = [...new Set(places.map(place => place.price_range))].filter(Boolean).sort();
  
  return (
    <div>
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="typeFilter" className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Category
            </label>
            <select
              id="typeFilter"
              className="w-full border border-gray-300 rounded-md py-2 px-3"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">All Categories</option>
              {placeTypes.map(type => (
                <option key={type.id} value={type.id.toString()}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="priceFilter" className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Price Range
            </label>
            <select
              id="priceFilter"
              className="w-full border border-gray-300 rounded-md py-2 px-3"
              value={priceFilter}
              onChange={(e) => setPriceFilter(e.target.value)}
            >
              <option value="">All Price Ranges</option>
              {priceRanges.map(price => (
                <option key={price} value={price}>
                  {price}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      {/* Map with filtered places */}
      <div className="mb-6">
        <SimpleMap 
          lat={55.9533}  // Edinburgh center
          lng={-3.1883}
          zoom={13}
          places={filteredPlaces}
        />
      </div>
      
      {/* Places list */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        {filteredPlaces.length === 0 ? (
          <div className="col-span-full text-center py-8">
            <p className="text-gray-500">No places match your current filters</p>
          </div>
        ) : (
          filteredPlaces.map(place => (
            <div key={place.id} className="bg-white shadow-sm rounded-lg p-4 hover:shadow-md transition-shadow">
              <h3 className="font-semibold text-lg mb-1">{place.name}</h3>
              {place.type_name && (
                <span className="inline-block bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs mb-2">
                  {place.type_name}
                </span>
              )}
              <p className="text-gray-600 text-sm mb-2">{place.address}</p>
              {place.opening_hours && (
                <p className="text-sm text-gray-500">
                  {cleanOpeningHours(place.opening_hours)}
                </p>
              )}
              <a 
                href={`/places/${place.id}`} 
                className="block mt-3 text-sm text-blue-600 hover:underline"
              >
                View details →
              </a>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

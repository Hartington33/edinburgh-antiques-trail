'use client';

import { PlaceWithDetails } from '@/lib/data-utils';
import Link from 'next/link';

interface DashboardMapProps {
  places: PlaceWithDetails[];
}

const typeLabels = {
  1: 'Antique', // Antique Shop
  2: 'Auction', // Auction House
  3: 'Books', // Book Shop
  4: 'Records', // Record Shop
  5: 'Vintage', // Vintage Clothing
  6: 'Fair', // Antique Fair
  7: 'Furniture', // Furniture
  8: 'Charity', // Charity Shop
};

// Map type IDs to colors
const typeColors = {
  1: 'bg-red-500', // Antique Shop
  2: 'bg-blue-500', // Auction House
  3: 'bg-green-500', // Book Shop
  4: 'bg-purple-500', // Record Shop
  5: 'bg-yellow-500', // Vintage Clothing
  6: 'bg-orange-500', // Antique Fair
  7: 'bg-amber-800', // Furniture (Brown)
  8: 'bg-gray-700', // Charity Shop (Dark Grey)
};

export default function DashboardMap({ places }: DashboardMapProps) {
  // Create a simplified map visualization without external dependencies
  return (
    <div className="rounded-lg overflow-hidden border-2 border-edinburgh-stone">
      {/* Map Header */}
      <div className="bg-edinburgh-blue text-white p-4">
        <h3 className="text-lg font-semibold">Edinburgh Antiques Trail</h3>
        <p className="text-sm">{places.length} locations available to explore</p>
      </div>
      
      {/* Simple visual representation */}
      <div className="bg-edinburgh-stone p-4">
        <div className="grid grid-cols-3 gap-2">
          {places.slice(0, 9).map(place => (
            <div key={place.id} className="bg-white rounded p-2 text-center shadow-sm">
              <span className={`inline-block w-6 h-6 rounded-full ${typeColors[place.type_id as keyof typeof typeColors] || 'bg-gray-500'} text-white text-xs flex items-center justify-center font-bold`}>
                {place.type_id}
              </span>
            </div>
          ))}
        </div>
        
        <div className="mt-4 text-center">
          <Link 
            href="/map" 
            className="inline-block px-4 py-2 bg-edinburgh-blue text-white rounded-md hover:bg-opacity-90"
          >
            View Full Map
          </Link>
        </div>
      </div>
      
      {/* Preview of popular locations */}
      <div className="bg-white p-4 border-t-2 border-edinburgh-stone">
        <h3 className="font-semibold mb-3 text-edinburgh-blue text-lg">Popular Locations</h3>
        
        {places.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {places.slice(0, 4).map(place => (
              <Link 
                key={place.id}
                href={`/places/${place.id}`}
                className="p-4 border border-gray-300 rounded-lg hover:bg-edinburgh-stone/10 transition-colors flex items-start"
              >
                <span className={`inline-block w-8 h-8 rounded-full ${typeColors[place.type_id as keyof typeof typeColors] || 'bg-gray-500'} text-white text-sm flex items-center justify-center font-bold mr-3`}>
                  {typeLabels[place.type_id as keyof typeof typeLabels] ? typeLabels[place.type_id as keyof typeof typeLabels].charAt(0) : '?'}
                </span>
                <div>
                  <div className="font-medium text-edinburgh-blue">{place.name}</div>
                  <p className="text-sm text-gray-600 truncate">{place.address}</p>
                  {place.price_range && (
                    <p className="text-sm mt-1 bg-edinburgh-stone inline-block px-2 py-0.5 rounded text-edinburgh-blue">
                      {place.price_range}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center p-4 bg-gray-100 rounded">
            <p>No locations available</p>
          </div>
        )}
      </div>
    </div>
  );
}

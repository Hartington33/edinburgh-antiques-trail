'use client';

import React from 'react';
import Link from 'next/link';

// Define the type colors to match what's used in the map
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

interface PlaceType {
  id: number;
  name: string;
}

interface MapCategoryLegendProps {
  placeTypes: PlaceType[];
  selectedTypeIds?: number[];
  onTypeClick?: (typeId: number) => void;
  onClearFilters?: () => void;
}

export default function MapCategoryLegend({ 
  placeTypes, 
  selectedTypeIds = [], 
  onTypeClick,
  onClearFilters
}: MapCategoryLegendProps) {
  // Handle type selection
  const handleTypeClick = (typeId: number) => {
    if (onTypeClick) {
      onTypeClick(typeId);
    }
  };
  
  // Check if a type is currently selected
  const isTypeSelected = (typeId: number): boolean => {
    return selectedTypeIds.includes(typeId);
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-3">Categories</h3>
      
      <div className="space-y-2">
        {placeTypes.map(type => {
          const colorInfo = typeColors[type.id as keyof typeof typeColors] || 
                          { color: '#AAAAAA', name: type.name };
          
          return (
            <div 
              key={type.id} 
              className={`flex items-center p-2 rounded-md cursor-pointer transition-colors ${
                isTypeSelected(type.id) ? 'bg-gray-100' : 'hover:bg-gray-50'
              }`}
              onClick={() => handleTypeClick(type.id)}
            >
              <div className="flex items-center">
                <div 
                  className="w-4 h-4 rounded-full mr-3 flex-shrink-0"
                  style={{ backgroundColor: colorInfo.color }}
                />
                {isTypeSelected(type.id) && (
                  <div className="absolute ml-1 -mt-3">
                    <svg className="w-3 h-3 text-edinburgh-blue fill-current" viewBox="0 0 20 20">
                      <path d="M0 11l2-2 5 5L18 3l2 2L7 18z" />
                    </svg>
                  </div>
                )}
              </div>
              <span className="text-sm">{type.name}</span>
            </div>
          );
        })}
      </div>
      
      {selectedTypeIds.length > 0 && (
        <button 
          className="w-full mt-3 py-1 text-xs text-edinburgh-blue hover:underline"
          onClick={() => onClearFilters && onClearFilters()}
        >
          Show All
        </button>
      )}
      
      <div className="mt-4 pt-3 border-t border-gray-100">
        <Link 
          href="/types" 
          className="text-sm text-edinburgh-blue hover:underline"
        >
          Manage Categories
        </Link>
      </div>
    </div>
  );
}

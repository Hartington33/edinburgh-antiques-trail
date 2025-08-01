'use client';

import { useState, useEffect } from 'react';
import { ChevronDownIcon, ChevronRightIcon, PlusIcon } from '@heroicons/react/24/outline';

interface Specialty {
  id: number;
  name: string;
  description: string;
  parent_id: number | null;
  subcategories?: Specialty[];
}

interface HierarchicalSpecialtySelectorProps {
  onChange: (ids: number[]) => void;
  initialSelectedIds?: number[];
  placeId?: number;
}

export default function HierarchicalSpecialtySelector({
  onChange,
  initialSelectedIds = [],
  placeId
}: HierarchicalSpecialtySelectorProps) {
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>(initialSelectedIds);
  const [expandedCategories, setExpandedCategories] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [specialtyRequest, setSpecialtyRequest] = useState('');
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState(false);

  // Fetch hierarchical specialties
  useEffect(() => {
    const fetchSpecialties = async () => {
      try {
        setLoading(true);
        const url = '/api/specialties?hierarchical=true';
        
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Failed to fetch specialties');
        }
        
        const data = await response.json();
        setSpecialties(data);
        
        // Auto-expand categories that have selected subcategories
        if (initialSelectedIds.length > 0) {
          const categoriesToExpand = new Set<number>();
          
          // Find all subcategories in the initial selection
          const expandParentsOfSelectedSubcategories = (categories: Specialty[]) => {
            categories.forEach(category => {
              if (category.subcategories) {
                category.subcategories.forEach(sub => {
                  if (initialSelectedIds.includes(sub.id)) {
                    categoriesToExpand.add(category.id);
                  }
                });
                expandParentsOfSelectedSubcategories(category.subcategories);
              }
            });
          };
          
          expandParentsOfSelectedSubcategories(data);
          setExpandedCategories(Array.from(categoriesToExpand));
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching specialties:', error);
        setError('Failed to load specialties. Please try again.');
        setLoading(false);
      }
    };
    
    fetchSpecialties();
  }, [initialSelectedIds]);

  // Toggle expand/collapse a category
  const toggleExpand = (categoryId: number) => {
    setExpandedCategories(prev => {
      if (prev.includes(categoryId)) {
        return prev.filter(id => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
  };

  // Toggle selection of a specialty
  const toggleSpecialty = (specialtyId: number) => {
    setSelectedIds(prev => {
      if (prev.includes(specialtyId)) {
        return prev.filter(id => id !== specialtyId);
      } else {
        return [...prev, specialtyId];
      }
    });
  };

  // When selectedIds changes, notify parent component
  useEffect(() => {
    onChange(selectedIds);
  }, [selectedIds, onChange]);

  // Handle specialty request submission
  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!specialtyRequest.trim() || !placeId) return;

    try {
      setRequestSubmitting(true);
      
      // TODO: Replace with actual API endpoint when available
      const response = await fetch('/api/specialty-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          placeId,
          requestText: specialtyRequest.trim()
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit specialty request');
      }

      setRequestSuccess(true);
      setSpecialtyRequest('');
      
      // Reset success message after a few seconds
      setTimeout(() => {
        setRequestSuccess(false);
      }, 5000);
    } catch (error) {
      console.error('Error submitting specialty request:', error);
      setError('Failed to submit request. Please try again.');
    } finally {
      setRequestSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 bg-white rounded-lg shadow">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6 mb-2"></div>
        </div>
        <p className="text-center text-gray-500 mt-2">Loading specialties...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-white rounded-lg shadow">
        <p className="text-red-500">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-2 text-indigo-600 hover:text-indigo-800"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4">
        <h3 className="font-medium text-lg mb-3">Select Your Shop's Specialties</h3>
        <p className="text-sm text-gray-500 mb-4">
          Select all specialties that apply to your shop. You can select both main categories and specific subcategories.
        </p>
        
        <div className="space-y-2 max-h-96 overflow-y-auto border border-gray-200 p-3 rounded">
          {specialties.map(category => (
            <div key={category.id} className="specialty-category mb-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id={`specialty-${category.id}`}
                  checked={selectedIds.includes(category.id)}
                  onChange={() => toggleSpecialty(category.id)}
                  className="mr-2 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label 
                  htmlFor={`specialty-${category.id}`}
                  className="text-sm font-medium text-gray-700 flex-grow cursor-pointer"
                >
                  {category.name}
                </label>
                
                {category.subcategories && category.subcategories.length > 0 && (
                  <button
                    type="button"
                    onClick={() => toggleExpand(category.id)}
                    className="ml-2 text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    {expandedCategories.includes(category.id) ? (
                      <ChevronDownIcon className="h-4 w-4" />
                    ) : (
                      <ChevronRightIcon className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>
              
              {expandedCategories.includes(category.id) && 
               category.subcategories && 
               category.subcategories.length > 0 && (
                <div className="ml-6 mt-2 space-y-1 pl-2 border-l border-gray-100">
                  {category.subcategories.map(sub => (
                    <div key={sub.id} className="flex items-center py-1">
                      <input
                        type="checkbox"
                        id={`specialty-${sub.id}`}
                        checked={selectedIds.includes(sub.id)}
                        onChange={() => toggleSpecialty(sub.id)}
                        className="mr-2 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <label 
                        htmlFor={`specialty-${sub.id}`}
                        className="text-sm text-gray-600 cursor-pointer"
                      >
                        {sub.name}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-100 p-4">
        <h4 className="font-medium text-sm mb-2">Don't see your specialty?</h4>
        <form onSubmit={handleRequestSubmit} className="flex flex-col space-y-2">
          <div>
            <label htmlFor="specialty-request" className="sr-only">Request a new specialty</label>
            <input
              type="text"
              id="specialty-request"
              name="specialty-request"
              value={specialtyRequest}
              onChange={(e) => setSpecialtyRequest(e.target.value)}
              placeholder="Describe the specialty you'd like to add..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              disabled={requestSubmitting}
            />
          </div>
          
          <button
            type="submit"
            disabled={requestSubmitting || !specialtyRequest.trim()}
            className={`inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
              requestSubmitting || !specialtyRequest.trim()
                ? 'bg-indigo-300 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
            }`}
          >
            {requestSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Submitting...
              </>
            ) : (
              <>
                <PlusIcon className="-ml-1 mr-2 h-4 w-4" />
                Request New Specialty
              </>
            )}
          </button>
          
          {requestSuccess && (
            <p className="text-sm text-green-600 mt-1">
              Your specialty request has been submitted for review.
            </p>
          )}
        </form>
      </div>

      <div className="border-t border-gray-100 p-4 bg-gray-50 rounded-b-lg">
        <div className="flex justify-between items-center">
          <div>
            <span className="text-sm text-gray-500">
              {selectedIds.length} {selectedIds.length === 1 ? 'specialty' : 'specialties'} selected
            </span>
          </div>
          
          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="text-sm text-indigo-600 hover:text-indigo-800"
            >
              Clear all
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import EnhancedShopForm from '@/components/EnhancedShopForm';

// Import types from data-utils
import { Place, PlaceType, OpeningHour } from '@/lib/data-utils';

export default function AddPlace() {
  const [placeTypes, setPlaceTypes] = useState<PlaceType[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  
  // Fetch place types when the component mounts
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const placeTypesRes = await fetch('/api/place-types');
        
        if (!placeTypesRes.ok) {
          throw new Error('Failed to fetch required data');
        }
        
        const placeTypesData = await placeTypesRes.json();
        setPlaceTypes(placeTypesData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        console.error('Error loading data:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Handle form submission
  const handleSubmit = async (data: any, hours: OpeningHour[]) => {
    setSubmitting(true);
    setError(null);
    
    try {
      // First create the place
      const res = await fetch('/api/places', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          // Ensure boolean values are properly handled
          has_disabled_access: data.has_disabled_access === true,
          has_toilet_facilities: data.has_toilet_facilities === true,
        }),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create place');
      }
      
      const placeData = await res.json();
      const newPlaceId = placeData.id;
      
      // Then add opening hours if present
      if (hours && hours.length > 0 && newPlaceId) {
        // Add opening hours
        for (const hour of hours) {
          const hourData = {
            ...hour,
            place_id: newPlaceId
          };
          
          await fetch('/api/opening-hours', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(hourData),
          });
        }
      }
      
      router.push('/admin/places');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error creating place:', err);
      setSubmitting(false);
    }
  };
  
  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Loading form data...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-edinburgh-blue">Add New Place</h1>
          <Link href="/admin/places" className="px-4 py-2 border rounded-md text-edinburgh-blue hover:bg-gray-50">
            Back to Places
          </Link>
        </div>
        
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-2 text-sm underline"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-edinburgh-blue">Add New Place</h1>
        <Link href="/admin/places" className="px-4 py-2 border rounded-md text-edinburgh-blue hover:bg-gray-50">
          Back to Places
        </Link>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <EnhancedShopForm
          place={null}
          placeTypes={placeTypes}
          openingHours={[]}
          onSubmit={handleSubmit}
          submitting={submitting}
        />
      </div>
    </div>
  );
}

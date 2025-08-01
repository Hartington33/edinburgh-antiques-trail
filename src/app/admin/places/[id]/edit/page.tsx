'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import EnhancedShopForm from '@/components/EnhancedShopForm';

// Import types from data-utils instead of defining them here
import { Place, PlaceType, OpeningHour } from '@/lib/data-utils';

export default function EditPlace({ params }: { params: { id: string } }) {
  const [place, setPlace] = useState<Place | null>(null);
  const [placeTypes, setPlaceTypes] = useState<PlaceType[]>([]);
  const [openingHours, setOpeningHours] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch place, place types, and opening hours in parallel
        const [placeRes, placeTypesRes, openingHoursRes] = await Promise.all([
          fetch(`/api/places?id=${params.id}`),
          fetch('/api/place-types'),
          fetch(`/api/opening-hours?place_id=${params.id}`)
        ]);
        
        if (!placeRes.ok) {
          throw new Error('Failed to load place data');
        }
        
        if (!placeTypesRes.ok) {
          throw new Error('Failed to fetch required data');
        }
        
        const placeData = await placeRes.json();
        const placeTypesData = await placeTypesRes.json();
        let openingHoursData = [];
        
        if (openingHoursRes.ok) {
          openingHoursData = await openingHoursRes.json();
        }
        
        setPlace(placeData);
        setPlaceTypes(placeTypesData);
        setOpeningHours(openingHoursData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        console.error('Error loading data:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [params.id]);
  
  const handleSubmit = async (data: any, hours: any[]) => {
    setSubmitting(true);
    setError(null);
    
    try {
      // First update the place data
      const placeRes = await fetch(`/api/places?id=${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!placeRes.ok) {
        const errorData = await placeRes.json();
        throw new Error(errorData.error || 'Failed to update place');
      }
      
      // Then update opening hours if present
      if (hours && hours.length > 0) {
        // Delete existing opening hours
        await fetch(`/api/opening-hours?place_id=${params.id}`, {
          method: 'DELETE',
        });
        
        // Add new opening hours
        for (const hour of hours) {
          const hourData = {
            ...hour,
            place_id: parseInt(params.id)
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
      console.error('Error updating place:', err);
      setSubmitting(false);
    }
  };
  
  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Loading place data...</p>
      </div>
    );
  }
  
  if (error || !place) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-edinburgh-blue">Edit Place</h1>
          <Link href="/admin/places" className="px-4 py-2 border rounded-md text-edinburgh-blue hover:bg-gray-50">
            Back to Places
          </Link>
        </div>
        
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <p>{error || 'Place not found'}</p>
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
        <h1 className="text-3xl font-bold text-edinburgh-blue">Edit {place.name}</h1>
        <Link href="/admin/places" className="px-4 py-2 border rounded-md text-edinburgh-blue hover:bg-gray-50">
          Back to Places
        </Link>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <EnhancedShopForm
          place={place}
          placeTypes={placeTypes}
          openingHours={openingHours}
          onSubmit={handleSubmit}
          submitting={submitting}
        />
      </div>
    </div>
  );
}

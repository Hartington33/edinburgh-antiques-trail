'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import PlaceForm from '@/components/PlaceForm';

// Neighborhood interface removed

interface PlaceType {
  id: number;
  name: string;
}

interface Place {
  id: number;
  name: string;
  address: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  description: string | null;
  specialties: string | null;
  opening_hours: string | null;
  lat: number;
  lng: number;
  type_id: number;
  price_range: string | null;
}

export default function EditPlacePage() {
  const params = useParams() as { id: string };
  const router = useRouter();
  const [place, setPlace] = useState<Place | null>(null);
  // Neighborhoods removed
  const [placeTypes, setPlaceTypes] = useState<PlaceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [placeRes, placeTypesRes] = await Promise.all([
          fetch(`/api/places?id=${params.id}`),
          fetch('/api/place-types')
        ]);
        
        if (!placeRes.ok) {
          throw new Error('Failed to fetch place');
        }
        
        const placeData = await placeRes.json();
        const placeTypesData = await placeTypesRes.json();
        
        // Handle both array and single object responses
        if (Array.isArray(placeData) && placeData.length > 0) {
          setPlace(placeData[0]);
        } else if (!Array.isArray(placeData) && placeData.id) {
          setPlace(placeData);
        } else {
          console.error('Invalid place data format:', placeData);
          setPlace(null);
        }
        
        setPlaceTypes(placeTypesData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (params.id) {
      fetchData();
    }
  }, [params.id]);
  
  const handleSubmit = async (formData: any) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/places?id=${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update place');
      }
      
      // Instead of using router.push, navigate with full page refresh
      window.location.href = `/places/${params.id}`;
    } catch (error) {
      console.error('Error updating place:', error);
      alert('Failed to update place. Please check form data and try again.');
    } finally {
      setSubmitting(false);
    }
  };
  
  if (loading) {
    return <div className="flex justify-center items-center h-96">Loading...</div>;
  }
  
  if (!place) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold text-gray-700">Place not found</h2>
        <p className="mt-2">The place you are trying to edit might have been removed or doesn't exist.</p>
        <Link href="/places" className="btn btn-primary mt-4 inline-block">
          Back to Places
        </Link>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-edinburgh-blue mb-2">Edit Place</h1>
        <p className="text-lg text-gray-600">
          Update information for {place.name}
        </p>
      </div>
      
      <div className="bg-white shadow-md rounded-lg p-6">
        <PlaceForm 
          place={place}
          placeTypes={placeTypes}
          onSubmit={handleSubmit}
          submitting={submitting}
        />
      </div>
      
      <div className="pt-4">
        <Link href={`/places/${params.id}`} className="text-edinburgh-blue hover:underline flex items-center">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to place details
        </Link>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PlaceForm from '@/components/PlaceForm';

// Neighborhood interface removed

interface PlaceType {
  id: number;
  name: string;
}

export default function NewPlacePage() {
  const router = useRouter();
  // Neighborhoods removed
  const [placeTypes, setPlaceTypes] = useState<PlaceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const placeTypesRes = await fetch('/api/place-types');
        const placeTypesData = await placeTypesRes.json();
        setPlaceTypes(placeTypesData);
      } catch (error) {
        console.error('Error fetching form data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  const handleSubmit = async (formData: any) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/places', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create place');
      }
      
      const data = await res.json();
      router.push(`/places/${data.id}`);
    } catch (error) {
      console.error('Error creating place:', error);
      alert('Failed to create place. Please check form data and try again.');
    } finally {
      setSubmitting(false);
    }
  };
  
  if (loading) {
    return <div className="flex justify-center items-center h-96">Loading...</div>;
  }
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-edinburgh-blue mb-2">Add New Place</h1>
        <p className="text-lg text-gray-600">
          Create a new entry for the Edinburgh Antiques Trail.
        </p>
      </div>
      
      <div className="bg-white shadow-md rounded-lg p-6">
        <PlaceForm 
          place={null}
          placeTypes={placeTypes}
          onSubmit={handleSubmit}
          submitting={submitting}
        />
      </div>
      
      <div className="pt-4">
        <Link href="/places" className="text-edinburgh-blue hover:underline flex items-center">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to places
        </Link>
      </div>
    </div>
  );
}

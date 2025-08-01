'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Place {
  id: number;
  name: string;
  address: string;
  phone?: string;
  email?: string;
  website?: string;
  description?: string;
  specialties?: string;
  opening_hours?: string;
  lat: number;
  lng: number;
  type_id: number;
  type_name: string;
  neighborhood_id: number;
  neighborhood_name: string;
}

export default function PlacesAdmin() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchPlaces = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/places');
        
        if (!res.ok) {
          throw new Error('Failed to fetch places');
        }
        
        const data = await res.json();
        setPlaces(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        console.error('Error fetching places:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPlaces();
  }, []);
  
  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this place?')) {
      return;
    }
    
    try {
      const res = await fetch(`/api/places?id=${id}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) {
        throw new Error('Failed to delete place');
      }
      
      // Update the places list
      setPlaces(places.filter(place => place.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error deleting place:', err);
    }
  };
  
  if (loading) {
    return <div className="text-center py-8">Loading places...</div>;
  }
  
  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-edinburgh-blue text-white rounded-md"
        >
          Try Again
        </button>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-edinburgh-blue mb-2">Manage Places</h1>
          <p className="text-gray-600">
            Add, edit, or delete places in the Edinburgh Antiques Trail.
          </p>
        </div>
        <div className="flex space-x-4">
          <Link href="/admin" className="px-4 py-2 border rounded-md text-edinburgh-blue hover:bg-gray-50">
            Back to Dashboard
          </Link>
          <Link 
            href="/admin/places/bulk-edit" 
            className="px-4 py-2 border border-edinburgh-blue text-edinburgh-blue rounded-md hover:bg-gray-50"
          >
            Bulk Edit
          </Link>
          <Link 
            href="/admin/places/new" 
            className="px-4 py-2 bg-edinburgh-blue text-white rounded-md hover:bg-opacity-90"
          >
            Add New Place
          </Link>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Neighborhood</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {places.map(place => (
              <tr key={place.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-medium text-gray-900">{place.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-edinburgh-stone text-edinburgh-blue">
                    {place.type_name}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                  {place.neighborhood_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                  {place.address}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end space-x-2">
                    <Link 
                      href={`/admin/places/${place.id}`}
                      className="text-edinburgh-blue hover:text-opacity-70"
                    >
                      View
                    </Link>
                    <Link 
                      href={`/admin/places/${place.id}/edit`}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(place.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {places.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No places found.</p>
          <Link
            href="/admin/places/new"
            className="mt-4 inline-block px-4 py-2 bg-edinburgh-blue text-white rounded-md"
          >
            Add Your First Place
          </Link>
        </div>
      )}
    </div>
  );
}

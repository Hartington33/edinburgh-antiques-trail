import { Suspense } from 'react';
import { getPlaces, getPlaceTypes } from '@/lib/data-utils';
import PlacesFilters from '@/components/PlacesFilters';

export default async function PlacesPage() {
  // Fetch all data on the server
  const [places, placeTypes] = await Promise.all([
    getPlaces(),
    getPlaceTypes()
  ]);
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-edinburgh-blue mb-2">Places</h1>
        <p className="text-lg text-gray-600">
          Browse and discover antique establishments throughout Edinburgh.
        </p>
      </div>
      
      <Suspense fallback={<div>Loading places...</div>}>
        <PlacesFilters 
          initialPlaces={places} 
          placeTypes={placeTypes} 
        />
      </Suspense>
    </div>
  );
}

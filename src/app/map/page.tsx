import { getPlaces, getPlaceTypes } from '@/lib/data-utils';
import MapPageClient from './MapPageClient';

// Force dynamic rendering to ensure the page is reloaded on navigation
export const revalidate = 0;

export default async function MapPage() {
  // Fetch all data on the server
  const [rawPlaces, placeTypes] = await Promise.all([
    getPlaces(),
    getPlaceTypes()
  ]);

  // Process places: ensure lat/lng are valid numbers and add originalIndex
  const processedPlaces = rawPlaces
    .map(place => ({
      ...place,
      // Attempt to parse lat and lng to numbers
      lat: parseFloat(String(place.lat)), 
      lng: parseFloat(String(place.lng)),
    }))
    .filter(place => 
      // Filter out places where lat or lng is NaN or not a finite number
      !isNaN(place.lat) && isFinite(place.lat) &&
      !isNaN(place.lng) && isFinite(place.lng)
    )
    .map((place, index) => ({
      ...place,
      // Assign originalIndex to the filtered, valid list
      originalIndex: index, 
    }));

  // Use processedPlaces instead of places
  // Note: Ensure MapPageClient props expect 'places' and not 'processedPlaces' or update accordingly.
  // Assuming MapPageClient expects a prop named 'places':
  const places = processedPlaces;
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-edinburgh-blue mb-2">Edinburgh Antiques Map</h1>
        <p className="text-lg text-gray-600">
          Explore antique shops, auction houses, and more throughout Edinburgh.
        </p>
      </div>
      
      {/* New map page client with filtering and bounds-based results */}
      <MapPageClient places={places} placeTypes={placeTypes} />
    </div>
  );
}

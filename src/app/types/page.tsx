import { getPlaces, getPlaceTypes } from '@/lib/data-utils';
import Link from 'next/link';

export default async function TypesPage() {
  // Fetch place types and their associated places
  const [places, placeTypes] = await Promise.all([
    getPlaces(),
    getPlaceTypes()
  ]);
  
  // Group places by type
  const placesByType = places.reduce((acc, place) => {
    const typeId = place.type_id;
    if (!acc[typeId]) {
      acc[typeId] = [];
    }
    acc[typeId].push(place);
    return acc;
  }, {} as Record<number, typeof places>);
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-edinburgh-blue mb-1">Categories</h1>
          <p className="text-lg text-gray-600">
            Browse antique shops and other venues by category
          </p>
        </div>
        
        <Link 
          href="/types/new" 
          className="btn btn-primary"
        >
          Add Category
        </Link>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {placeTypes.map(type => {
          const typePlaces = placesByType[type.id] || [];
          
          return (
            <div key={type.id} className="card">
              <div className="border-b pb-3 mb-3">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-edinburgh-blue">
                    {type.name}
                  </h2>
                  <span className="text-sm bg-edinburgh-stone text-edinburgh-blue px-2 py-1 rounded-full">
                    {typePlaces.length} {typePlaces.length === 1 ? 'place' : 'places'}
                  </span>
                </div>
              </div>
              
              <div className="space-y-2 mb-4">
                {typePlaces.length > 0 ? (
                  typePlaces.slice(0, 5).map(place => (
                    <Link 
                      key={place.id} 
                      href={`/places/${place.id}`}
                      className="block p-2 hover:bg-gray-50 rounded-md transition-colors"
                    >
                      <span className="font-medium">{place.name}</span>
                      <p className="text-sm text-gray-500 truncate">{place.address}</p>
                    </Link>
                  ))
                ) : (
                  <p className="text-gray-500 italic">No places in this category yet</p>
                )}
                
                {typePlaces.length > 5 && (
                  <p className="text-sm text-edinburgh-blue">
                    + {typePlaces.length - 5} more places
                  </p>
                )}
              </div>
              
              <div className="flex space-x-2">
                <Link 
                  href={`/types/${type.id}/edit`} 
                  className="text-sm text-edinburgh-blue hover:underline"
                >
                  Edit
                </Link>
                <span className="text-gray-300">|</span>
                <Link 
                  href={`/map?type=${type.id}`} 
                  className="text-sm text-edinburgh-blue hover:underline"
                >
                  View on Map
                </Link>
              </div>
            </div>
          );
        })}
      </div>
      
      {placeTypes.length === 0 && (
        <div className="text-center py-12">
          <h2 className="text-xl font-medium text-gray-600 mb-2">No categories yet</h2>
          <p className="text-gray-500 mb-4">Start by adding your first category</p>
          <Link 
            href="/types/new" 
            className="btn btn-primary"
          >
            Add Category
          </Link>
        </div>
      )}
    </div>
  );
}

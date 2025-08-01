import { getPlaceById } from '@/lib/data-utils';
import { getOpeningHoursByPlaceId, isPlaceCurrentlyOpen, willPlaceCloseSoon } from '@/lib/opening-hours-utils';
import { getOnlineSalesLinksByPlaceId } from '@/lib/online-sales-utils';
import PlaceDetailClient from './PlaceDetailClient';

export default async function PlaceDetailPage({ params }: { params: { id: string } }) {
  try {
    // Fetch all the required data server-side
    const placeId = parseInt(params.id);
    const place = await getPlaceById(placeId);
    
    if (!place) {
      return (
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold text-gray-700">Place not found</h2>
          <p className="mt-2">The place you are looking for might have been removed or doesn't exist.</p>
          <a href="/places" className="btn btn-primary mt-4 inline-block">
            Back to Places
          </a>
        </div>
      );
    }
    
    const openingHours = await getOpeningHoursByPlaceId(placeId);
    const onlineSalesLinks = await getOnlineSalesLinksByPlaceId(placeId);
    const isOpen = await isPlaceCurrentlyOpen(placeId);
    const closingSoon = await willPlaceCloseSoon(placeId, 60);
    
    // Now render the client component with all the data
    return (
      <PlaceDetailClient 
        place={place}
        openingHours={openingHours}
        onlineSalesLinks={onlineSalesLinks}
        isOpen={isOpen}
        closingSoon={closingSoon}
      />
    );
  } catch (error) {
    console.error('Error in PlaceDetailPage:', error);
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold text-red-700">Error loading place details</h2>
        <p className="mt-2">There was a problem loading the place details. Please try again later.</p>
        <a href="/places" className="btn btn-primary mt-4 inline-block">
          Back to Places
        </a>
      </div>
    );
  }
}

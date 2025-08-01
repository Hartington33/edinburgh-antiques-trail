import { getPlaceById } from '@/lib/data-utils';
import { getOpeningHoursByPlaceId, isPlaceCurrentlyOpen, willPlaceCloseSoon, isPlaceByAppointment } from '@/lib/opening-hours-utils';
import { getOnlineSalesLinksByPlaceId } from '@/lib/online-sales-utils';
import PlaceDetailClient from './PlaceDetailClient';

// Client-side error component to handle errors gracefully
function ErrorFallback() {
  return (
    <div className="text-center py-12">
      <h2 className="text-2xl font-semibold text-red-700">Error loading place details</h2>
      <p className="mt-2">There was a problem loading this page. It will refresh automatically.</p>
      <button 
        onClick={() => window.location.reload()}
        className="mt-4 px-4 py-2 bg-edinburgh-blue text-white rounded hover:bg-edinburgh-blue/80 transition-colors"
      >
        Refresh Now
      </button>
      <script dangerouslySetInnerHTML={{ 
        __html: `setTimeout(() => window.location.reload(), 1500);` 
      }} />
    </div>
  );
}

export default async function PlaceDetailPage({ params }: { params: { id: string } }) {
  try {
    // Add script for auto-refresh if there's a runtime error
    const autoRefreshScript = `
      window.addEventListener('error', function(e) {
        // If there's a runtime error, refresh after a short delay
        if (e.message && e.message.includes('infoWindowRef')) {
          console.log('Detected runtime error, auto-refreshing...');
          setTimeout(() => window.location.reload(), 100);
        }
      });
    `;
    
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
    const isByAppointment = await isPlaceByAppointment(placeId);
    
    // Now render the client component with all the data
    return (
      <>
        {/* Add auto-refresh script for runtime errors */}
        <script dangerouslySetInnerHTML={{ __html: autoRefreshScript }} />
        
        <PlaceDetailClient 
          place={place}
          openingHours={openingHours}
          onlineSalesLinks={onlineSalesLinks}
          isOpen={isOpen}
          closingSoon={closingSoon}
          isByAppointment={isByAppointment}
        />
      </>
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
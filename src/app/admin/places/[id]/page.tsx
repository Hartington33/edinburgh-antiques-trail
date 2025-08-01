'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Place, OpeningHour } from '@/lib/data-utils';

function formatOpeningHours(hours: OpeningHour[] | undefined) {
  if (!hours || hours.length === 0) {
    return <span className="text-gray-400">No opening hours available</span>;
  }

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  return (
    <ul className="list-none space-y-1">
      {hours.map((hour, index) => (
        <li key={index} className="flex">
          <span className="font-medium w-24">{days[hour.day_of_week]}:</span>
          {hour.is_closed ? (
            <span className="text-gray-500">Closed</span>
          ) : hour.is_by_appointment ? (
            <span className="text-gray-500">By appointment</span>
          ) : (
            <span className="text-gray-500">
              {hour.open_time} - {hour.close_time}
              {hour.notes && <span className="ml-2 text-xs">({hour.notes})</span>}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function ViewPlace({ params }: { params: { id: string } }) {
  const [place, setPlace] = useState<Place | null>(null);
  const [openingHours, setOpeningHours] = useState<OpeningHour[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch place and opening hours in parallel
        const [placeRes, openingHoursRes] = await Promise.all([
          fetch(`/api/places?id=${params.id}`),
          fetch(`/api/opening-hours?place_id=${params.id}`)
        ]);
        
        if (!placeRes.ok) {
          throw new Error('Failed to load place data');
        }
        
        const placeData = await placeRes.json();
        let openingHoursData: OpeningHour[] = [];
        
        if (openingHoursRes.ok) {
          openingHoursData = await openingHoursRes.json();
        }
        
        setPlace(placeData);
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
          <h1 className="text-3xl font-bold text-edinburgh-blue">View Place</h1>
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

  // Format price range for display
  const priceRangeDisplay = place.price_range || 'Not specified';
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-edinburgh-blue">{place.name}</h1>
        <div className="flex space-x-3">
          <Link href="/admin/places" className="px-4 py-2 border rounded-md text-edinburgh-blue hover:bg-gray-50">
            Back to Places
          </Link>
          <Link href={`/admin/places/${place.id}/edit`} className="px-4 py-2 bg-edinburgh-blue text-white rounded-md hover:bg-edinburgh-blue/90">
            Edit
          </Link>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-edinburgh-blue mb-4">Basic Information</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-gray-500 text-sm">Category</h3>
                <p>{place.type_name}</p>
              </div>
              
              <div>
                <h3 className="text-gray-500 text-sm">Address</h3>
                <p>{place.address}</p>
              </div>
              
              <div>
                <h3 className="text-gray-500 text-sm">Price Range</h3>
                <p>{priceRangeDisplay}</p>
              </div>
              
              <div>
                <h3 className="text-gray-500 text-sm">Description</h3>
                <p className="whitespace-pre-line">{place.description || 'No description provided'}</p>
              </div>
              
              <div>
                <h3 className="text-gray-500 text-sm">Specialties</h3>
                <p>{place.specialties || 'No specialties specified'}</p>
              </div>
            </div>
          </div>
          
          {/* Contact Information */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-edinburgh-blue mb-4">Contact Information</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-gray-500 text-sm">Phone</h3>
                <p>{place.phone || 'No phone number provided'}</p>
              </div>
              
              <div>
                <h3 className="text-gray-500 text-sm">Email</h3>
                <p>{place.email || 'No email provided'}</p>
              </div>
              
              <div>
                <h3 className="text-gray-500 text-sm">Website</h3>
                {place.website ? (
                  <a 
                    href={place.website.startsWith('http') ? place.website : `https://${place.website}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-edinburgh-blue hover:underline"
                  >
                    {place.website}
                  </a>
                ) : (
                  <p>No website provided</p>
                )}
              </div>
            </div>
          </div>
          
          {/* Social Media Links */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-edinburgh-blue mb-4">Social Media</h2>
            
            <div className="space-y-4">
              {['facebook_url', 'instagram_url', 'pinterest_url', 'twitter_url', 'youtube_url', 'snapchat_url'].some(
                key => place[key as keyof Place]
              ) ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {place.facebook_url && (
                    <div className="flex items-center">
                      <div className="mr-2 text-blue-600">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z"/>
                        </svg>
                      </div>
                      <a 
                        href={place.facebook_url.startsWith('http') ? place.facebook_url : `https://${place.facebook_url}`}
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-edinburgh-blue hover:underline"
                      >
                        Facebook
                      </a>
                    </div>
                  )}
                  
                  {place.instagram_url && (
                    <div className="flex items-center">
                      <div className="mr-2 text-pink-600">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2c2.717 0 3.056.01 4.122.06 1.065.05 1.79.217 2.428.465.66.254 1.216.598 1.772 1.153.509.5.902 1.105 1.153 1.772.247.637.415 1.363.465 2.428.047 1.066.06 1.405.06 4.122 0 2.717-.01 3.056-.06 4.122-.05 1.065-.218 1.79-.465 2.428a4.883 4.883 0 01-1.153 1.772c-.5.508-1.105.902-1.772 1.153-.637.247-1.363.415-2.428.465-1.066.047-1.405.06-4.122.06-2.717 0-3.056-.01-4.122-.06-1.065-.05-1.79-.218-2.428-.465a4.89 4.89 0 01-1.772-1.153 4.904 4.904 0 01-1.153-1.772c-.247-.637-.415-1.363-.465-2.428C2.013 15.056 2 14.717 2 12c0-2.717.01-3.056.06-4.122.05-1.066.217-1.79.465-2.428a4.88 4.88 0 011.153-1.772A4.897 4.897 0 015.45 2.525c.638-.247 1.362-.415 2.428-.465C8.944 2.013 9.283 2 12 2zm0 5a5 5 0 100 10 5 5 0 000-10zm6.5-.25a1.25 1.25 0 10-2.5 0 1.25 1.25 0 002.5 0zM12 9a3 3 0 110 6 3 3 0 010-6z"/>
                        </svg>
                      </div>
                      <a 
                        href={place.instagram_url.startsWith('http') ? place.instagram_url : `https://${place.instagram_url}`}
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-edinburgh-blue hover:underline"
                      >
                        Instagram
                      </a>
                    </div>
                  )}
                  
                  {place.pinterest_url && (
                    <div className="flex items-center">
                      <div className="mr-2 text-red-600">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C6.477 2 2 6.477 2 12c0 4.237 2.636 7.855 6.356 9.312-.088-.791-.167-2.005.035-2.868.182-.78 1.172-4.97 1.172-4.97s-.299-.6-.299-1.486c0-1.39.806-2.428 1.81-2.428.852 0 1.264.64 1.264 1.408 0 .858-.546 2.14-.828 3.33-.236.995.5 1.807 1.48 1.807 1.778 0 3.144-1.874 3.144-4.58 0-2.393-1.72-4.068-4.177-4.068-2.845 0-4.515 2.135-4.515 4.34 0 .859.331 1.781.745 2.281a.3.3 0 01.069.288l-.278 1.133c-.044.183-.145.223-.335.134-1.249-.581-2.03-2.407-2.03-3.874 0-3.154 2.292-6.052 6.608-6.052 3.469 0 6.165 2.473 6.165 5.776 0 3.447-2.173 6.22-5.19 6.22-1.013 0-1.965-.525-2.291-1.148l-.623 2.378c-.226.869-.835 1.958-1.244 2.621.937.29 1.931.446 2.962.446 5.523 0 10-4.477 10-10S17.523 2 12 2z"/>
                        </svg>
                      </div>
                      <a 
                        href={place.pinterest_url.startsWith('http') ? place.pinterest_url : `https://${place.pinterest_url}`}
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-edinburgh-blue hover:underline"
                      >
                        Pinterest
                      </a>
                    </div>
                  )}
                  
                  {place.twitter_url && (
                    <div className="flex items-center">
                      <div className="mr-2 text-gray-700">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                      </div>
                      <a 
                        href={place.twitter_url.startsWith('http') ? place.twitter_url : `https://${place.twitter_url}`}
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-edinburgh-blue hover:underline"
                      >
                        X / Twitter
                      </a>
                    </div>
                  )}
                  
                  {place.youtube_url && (
                    <div className="flex items-center">
                      <div className="mr-2 text-red-600">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                        </svg>
                      </div>
                      <a 
                        href={place.youtube_url.startsWith('http') ? place.youtube_url : `https://${place.youtube_url}`}
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-edinburgh-blue hover:underline"
                      >
                        YouTube
                      </a>
                    </div>
                  )}
                  
                  {place.snapchat_url && (
                    <div className="flex items-center">
                      <div className="mr-2 text-yellow-400">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M21.93 16.96c-.21-.4-.88-.57-1.26-.74-.17-.09-.35-.17-.43-.29-.08-.12-.07-.29-.05-.43l.01-.05c.03-.14.1-.42.12-.64.01-.15.01-.43-.09-.58-.1-.16-.33-.24-.57-.24-.08 0-.16.01-.22.02-.37.06-.63.22-.88.37l-.42.27c-.02-.29.02-.6.06-.9l.01-.05c.03-.14.1-.42.12-.64.01-.15.01-.43-.09-.58-.1-.16-.33-.24-.57-.24-.08 0-.16.01-.22.02-.5.08-.79.29-1.08.49l-.05.03c-.27.18-.54.35-.93.35-.17 0-.32-.04-.45-.11l.06-.18c.05-.15.11-.32.15-.51.02-.12.04-.25.05-.4 0-.15-.01-.33-.06-.48-.08-.24-.29-.42-.57-.42-.42 0-.71.17-.95.37l-.47.38c-.06-.07-.12-.13-.19-.19-.28-.22-.59-.37-.91-.37-.28 0-.56.14-.75.37-.24.29-.29.59-.19.95.4 1.52 2.15 2.73 3.19 3.31-.19.31-.45.57-.76.76-.32.2-.71.31-1.11.31-.37 0-.74-.09-1.09-.26-.12-.06-.24-.12-.36-.19-.41-.22-.79-.36-1.13-.36-.11 0-.22.02-.33.05-.39.11-.65.35-.76.7-.1.31-.06.65.1.95.46.88 1.76 1.45 2.92 1.45.08 0 .15 0 .23-.01 1.12-.05 2.1-.41 2.95-1.08.69-.54 1.24-1.27 1.67-2.19.08-.02.15-.05.23-.08.31-.12.59-.24.84-.37.15-.08.29-.16.44-.25.26-.16.49-.26.74-.26.15 0 .29.04.41.12.16.12.26.3.26.5.01.13-.05.26-.19.44z"/>
                        </svg>
                      </div>
                      <a 
                        href={place.snapchat_url.startsWith('http') ? place.snapchat_url : `https://${place.snapchat_url}`}
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-edinburgh-blue hover:underline"
                      >
                        Snapchat
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500">No social media links provided</p>
              )}
            </div>
          </div>
        </div>
        
        <div className="space-y-6">
          {/* Opening Hours */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-edinburgh-blue mb-4">Opening Hours</h2>
            {formatOpeningHours(openingHours)}
          </div>
          
          {/* Location Map */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-edinburgh-blue mb-4">Location</h2>
            <div className="h-60 bg-gray-100 rounded flex items-center justify-center">
              <iframe
                width="100%"
                height="100%"
                frameBorder="0"
                style={{ border: 0, borderRadius: '4px' }}
                src={`https://www.google.com/maps/embed/v1/place?key=YOUR_API_KEY&q=${encodeURIComponent(place.address)}&center=${place.lat},${place.lng}`}
                allowFullScreen
              ></iframe>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              Coordinates: {place.lat}, {place.lng}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

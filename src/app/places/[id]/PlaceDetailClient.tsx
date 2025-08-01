'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { OpeningHour, OnlineSalesLink } from '@/lib/data-utils';

// Dynamically import the SmallMap component to avoid SSR issues
const SmallMapComponent = dynamic(
  () => import('@/components/SmallMap'),
  { 
    ssr: false,
    loading: () => (
      <div className="bg-gray-100 rounded-lg flex items-center justify-center h-64">
        <div className="animate-pulse">
          <div className="h-8 w-8 bg-gray-200 rounded-full animate-spin"></div>
        </div>
      </div>
    )
  }
);

// Import our robust client-side formatting utilities
import { formatTime, cleanOpeningHoursText, formatDayHours } from '@/lib/client-format';
import { cleanTimeDisplay, processOpeningHours } from '@/components/fix-display';

// Pure client-side utility functions

// Use our imported formatter directly
function formatTimeForDisplay(time24: string): string {
  return formatTime(time24);
}
function formatUrl(url: string): string {
  if (!url) return '';
  if (!url.match(/^https?:\/\//i)) {
    return `https://${url}`;
  }
  return url;
}

function getPlatformIconClass(platformName: string): string {
  const name = platformName.toLowerCase();
  
  if (name.includes('ebay')) return 'fa-brands fa-ebay';
  if (name.includes('etsy')) return 'fa-brands fa-etsy';
  if (name.includes('amazon')) return 'fa-brands fa-amazon';
  if (name.includes('instagram')) return 'fa-brands fa-instagram';
  if (name.includes('facebook')) return 'fa-brands fa-facebook';
  if (name.includes('vinted')) return 'fa-solid fa-tag';
  if (name.includes('pinterest')) return 'fa-brands fa-pinterest';
  if (name.includes('tiktok')) return 'fa-brands fa-tiktok';
  if (name.includes('shopify')) return 'fa-brands fa-shopify';
  if (name.includes('twitter') || name.includes('x.com')) return 'fa-brands fa-twitter';
  
  return 'fa-solid fa-shopping-cart';
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
  specialty_ids?: number[];
  specialty_names?: { id: number; name: string; parent_id: number | null }[];
  opening_hours: string | null;
  lat: number;
  lng: number;
  type_id: number;
  type_name: string;
  price_range?: string | null;
}

interface PlaceDetailClientProps {
  place: Place;
  openingHours: OpeningHour[];
  onlineSalesLinks: OnlineSalesLink[];
  isOpen: boolean;
  closingSoon: boolean;
  isByAppointment: boolean;
}

// Map styles are now defined in the ClientOnlyMap component

// Import our simplified map component that works reliably
import SimpleMap from '@/components/SimpleMap';
import OpeningHoursDisplay from '@/components/OpeningHoursDisplay';

export default function PlaceDetailClient({ 
  place, 
  openingHours, 
  onlineSalesLinks, 
  isOpen, 
  closingSoon,
  isByAppointment 
}: PlaceDetailClientProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [hasError, setHasError] = useState(false);
  const hasAutoRefreshed = useRef(false);
  
  // Auto-refresh handler for runtime errors
  useEffect(() => {
    // Check for errors and auto-refresh once if needed
    const handleErrors = () => {
      if (!hasAutoRefreshed.current) {
        hasAutoRefreshed.current = true;
        console.log('Auto-refreshing page to resolve potential runtime errors...');
        window.location.reload();
      }
    };

    // Set up error detection
    const detectErrors = () => {
      try {
        // Check if Google Maps is defined (common source of errors)
        if (typeof window !== 'undefined' && 
            window.google && 
            !window.google.maps) {
          setHasError(true);
        }
        
        // Check for any runtime errors on the page
        if (document.querySelector('.nextjs-error-message') ||
            document.querySelector('[data-nextjs-error]')) {
          setHasError(true);
        }
      } catch (error) {
        console.error('Error detection failed:', error);
        setHasError(true);
      }
    };
    
    // Run detection after a short delay
    const errorTimer = setTimeout(() => {
      detectErrors();
      if (hasError) {
        handleErrors();
      }
    }, 500);
    
    // Clean up
    return () => clearTimeout(errorTimer);
  }, [hasError]);
  
  
  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this place? This action cannot be undone.')) {
      return;
    }
    
    setDeleting(true);
    try {
      const res = await fetch(`/api/places?id=${place.id}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) {
        throw new Error('Failed to delete place');
      }
      
      router.push('/places');
    } catch (error) {
      console.error('Error deleting place:', error);
      alert('Failed to delete place. Please try again.');
    } finally {
      setDeleting(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-edinburgh-blue mb-1">{place.name}</h1>
          <div className="flex flex-wrap gap-2 items-center">
            <span className="bg-edinburgh-stone text-edinburgh-blue px-3 py-1 rounded-full text-sm">
              {place.type_name}
            </span>
            {isOpen !== null && (
              <span className={`px-3 py-1 rounded-full text-sm ${isOpen 
                ? closingSoon 
                  ? 'bg-yellow-100 text-yellow-800' 
                  : 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'}`}>
                {isOpen 
                  ? closingSoon 
                    ? 'Closing Soon' 
                    : 'Open Now' 
                  : 'Closed'}
              </span>
            )}

            {isByAppointment && (
              <span className="px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800">
                By Appointment Only
              </span>
            )}
          </div>
        </div>
        
        <div className="flex space-x-3">
          <a href={`/places/${place.id}/edit`} className="btn btn-secondary" onClick={(e) => {
            e.preventDefault();
            window.location.href = `/places/${place.id}/edit`;
          }}>
            Edit
          </a>
          <button 
            onClick={handleDelete} 
            className="btn btn-danger"
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Details</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Address</h3>
                <p>{place.address}</p>
              </div>
              
              {place.phone && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Phone</h3>
                  <p>{place.phone}</p>
                </div>
              )}
              
              {place.email && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Email</h3>
                  <p>{place.email}</p>
                </div>
              )}
              
              {place.website && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Website</h3>
                  <a 
                    href={place.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-edinburgh-blue hover:underline"
                  >
                    {place.website}
                  </a>
                </div>
              )}
              
              <div className="card">
                <h2 className="text-xl font-semibold mb-4">Opening Hours</h2>
                
                {/* Status indicators */}
                <div className="flex items-center mb-4 space-x-3">
                  {isOpen && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <span className="w-2 h-2 bg-green-400 rounded-full mr-1"></span>
                      Open Now
                    </span>
                  )}
                  {!isOpen && isByAppointment && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      By Appointment Only
                    </span>
                  )}
                  {!isOpen && !isByAppointment && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      <span className="w-2 h-2 bg-gray-400 rounded-full mr-1"></span>
                      Closed Now
                    </span>
                  )}
                  {closingSoon && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      Closing Soon
                    </span>
                  )}
                </div>
                
                {/* New Opening Hours Component */}
                {openingHours && openingHours.length > 0 ? (
                  <OpeningHoursDisplay openingHours={openingHours} />
                ) : place.opening_hours ? (
                  <p className="whitespace-pre-line">{place.opening_hours?.replace(/0+By appointment/g, 'By appointment').replace(/\b0(\d)/g, '$1')}</p>
                ) : (
                  <p className="text-gray-500 italic">Hours not available</p>
                )}
              </div>
            </div>
          </div>
          
          {(place.description || place.specialties) && (
            <div className="card">
              <h2 className="text-xl font-semibold mb-4">About</h2>
              
              <div className="space-y-4">
                {place.description && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Description</h3>
                    <p className="whitespace-pre-line">{place.description}</p>
                  </div>
                )}
                
                {/* Specialty section with proper specialty links */}
                {(place.specialty_names && place.specialty_names.length > 0) ? (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Specialties</h3>
                    <div className="mt-2">
                      {/* Group specialties by parent categories */}
                      {(() => {
                        // Find all main categories that have children in the place's specialties
                        const mainCategories = place.specialty_names
                          .filter(s => s.parent_id === null)
                          .sort((a, b) => a.name.localeCompare(b.name));
                          
                        const subcategories = place.specialty_names
                          .filter(s => s.parent_id !== null)
                          .sort((a, b) => a.name.localeCompare(b.name));
                        
                        return (
                          <div className="space-y-2">
                            {mainCategories.map(mainCat => {
                              const children = subcategories.filter(sub => sub.parent_id === mainCat.id);
                              return (
                                <div key={mainCat.id} className="rounded-md bg-gray-50 p-3">
                                  <h4 className="font-medium">
                                    <Link href={`/map?specialties=${mainCat.id}`} className="text-edinburgh-blue hover:underline">
                                      {mainCat.name}
                                    </Link>
                                  </h4>
                                  {children.length > 0 && (
                                    <div className="mt-1 ml-4">
                                      <div className="space-y-1">
                                        {children.map(child => (
                                          <span key={child.id} className="text-sm">
                                            <Link href={`/map?specialties=${child.id}`} className="text-edinburgh-blue hover:underline">
                                              {child.name}
                                            </Link>
                                            {child !== children[children.length - 1] && ', '}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                ) : place.specialty_ids && place.specialty_ids.length > 0 && place.specialties ? (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Specialties</h3>
                    <p>
                      {place.specialties.split(',').map((specialty, index) => (
                        <span key={index}>
                          {index > 0 && ', '}
                          <Link 
                            href={`/map?specialties=${place.specialty_ids && index < place.specialty_ids.length ? 
                              place.specialty_ids[index] : 
                              encodeURIComponent(specialty.trim())}`}
                            className="text-edinburgh-blue hover:underline"
                          >
                            {specialty.trim()}
                          </Link>
                        </span>
                      ))}
                    </p>
                  </div>
                ) : place.specialties ? (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Specialties</h3>
                    <p>
                      {place.specialties.split(',').map((specialty, index) => (
                        <span key={index}>
                          {index > 0 && ', '}
                          <Link 
                            href={`/map?specialties=${encodeURIComponent(specialty.trim())}`}
                            className="text-edinburgh-blue hover:underline"
                          >
                            {specialty.trim()}
                          </Link>
                        </span>
                      ))}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          )}
          
          {/* Removed neighborhood card as it's no longer part of the app */}
        </div>
      </div>
      
      <div className="pt-4">
        <Link href="/places" className="text-edinburgh-blue hover:underline flex items-center">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to all places
        </Link>
      </div>
    </div>
  );
}
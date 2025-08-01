'use client';

import React, { useState, useEffect, useRef } from 'react';
import { OpeningHour } from '@/lib/data-utils';
import { FormattedOpeningHourGroup } from '@/lib/opening-hours-utils';
import { useRouter } from 'next/navigation';

interface FormattedOpeningHoursProps {
  placeId: number;
  fallbackText?: string;
  className?: string;
}

interface ApiResponse {
  raw: OpeningHour[];
  formatted: FormattedOpeningHourGroup[];
  status?: {
    isOpen: boolean;
    closingSoon: boolean;
  };
  // For backward compatibility with previous API versions
  isOpen?: boolean;
  closingSoon?: boolean;
}

// Cache to store previously fetched formatted hours by placeId with timestamp
interface CacheEntry {
  data: FormattedOpeningHourGroup[];
  timestamp: number;
}
const formattedCache = new Map<number, CacheEntry>();
// Cache expiration time (5 seconds)
const CACHE_TTL = 5000; // short cache time to ensure fresh data

export default function FormattedOpeningHours({ 
  placeId, 
  fallbackText = '', 
  className = '' 
}: FormattedOpeningHoursProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [formattedGroups, setFormattedGroups] = useState<FormattedOpeningHourGroup[] | null>(null);
  const [isPlaceOpen, setIsPlaceOpen] = useState<boolean>(false);
  const [isClosingSoon, setIsClosingSoon] = useState<boolean>(false);
  const lastPlaceId = useRef<number | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    // Set up mounted ref for cleanup
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    // Skip repeated fetches for the same placeId
    if (placeId === lastPlaceId.current && formattedGroups !== null) {
      return;
    }
    
    lastPlaceId.current = placeId;
    
    // Always fetch fresh data - cache disabled completely
    // Uncomment below for debugging
    console.log('Fetching fresh opening hours data for place:', placeId);
    
    // Fetch the structured opening hours from the API
    const fetchHours = async () => {
      try {
        const response = await fetch(`/api/opening-hours?placeId=${placeId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch opening hours');
        }
        
        const data = await response.json() as ApiResponse;
        console.log('API response:', data);
        
        // Add to cache with timestamp
        if (data.formatted) {
          // Cache disabled - not storing data
          // Just log the received data for debugging
          console.log('Received fresh opening hours data for place:', placeId);
          setFormattedGroups(data.formatted);
          
          // Set opening status
          if (data.status) {
            setIsPlaceOpen(data.status.isOpen);
            setIsClosingSoon(data.status.closingSoon);
          } else if (data.isOpen !== undefined) {
            // For backward compatibility
            setIsPlaceOpen(data.isOpen);
            setIsClosingSoon(data.closingSoon || false);
          }
        } else {
          // For backward compatibility with old API
          setFormattedGroups(null);
        }
      } catch (error) {
        console.error('Error fetching opening hours:', error);
        setFormattedGroups(null);
      } finally {
        setLoading(false);
      }
    };
    
    fetchHours();
  }, [placeId]);

  if (!placeId) {
    return <div className={className}>Hours not available</div>;
  }
  
  // Get current day of week (0 = Sunday, 1 = Monday, etc.)
  const getCurrentDayOfWeek = () => {
    const day = new Date().getDay();
    // Convert to Monday-first format (0 = Monday through 6 = Sunday)
    return day === 0 ? 6 : day - 1;
  };
  
  const currentDay = getCurrentDayOfWeek();
  const currentDayName = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][currentDay];
  
  // Format time to ensure leading zeros (e.g., 9:00 -> 09:00)
  const formatTimeWithLeadingZeros = (timeString: string): string => {
    if (!timeString || timeString === 'Closed' || timeString === 'By appointment only') {
      return timeString;
    }
    
    return timeString.replace(/\b(\d):(\d\d)\b/g, '0$1:$2');
  };
  
  // Helper to check if a day group contains the current day
  const isDayInGroup = (dayText: string): boolean => {
    // Single day
    if (!dayText.includes('to') && !dayText.includes('&')) {
      return dayText === currentDayName;
    }
    
    // Day range with 'to' (e.g. "Monday to Friday")
    if (dayText.includes('to')) {
      const [startDay, endDay] = dayText.split(' to ').map(d => d.trim());
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const startIdx = days.indexOf(startDay);
      const endIdx = days.indexOf(endDay);
      const currentIdx = days.indexOf(currentDayName);
      
      // Handle wrap-around case (e.g., "Sunday to Tuesday")
      if (endIdx < startIdx) {
        return currentIdx >= startIdx || currentIdx <= endIdx;
      }
      
      return currentIdx >= startIdx && currentIdx <= endIdx;
    }
    
    // Two days with '&' (e.g. "Saturday & Sunday")
    if (dayText.includes('&')) {
      const days = dayText.split(' & ').map(d => d.trim());
      return days.includes(currentDayName);
    }
    
    return false;
  };
  
  return (
    <div className={`mt-3 text-sm ${className}`}>
      {/* Status indicators */}
      {!loading && (
        <div className="mb-1">
          {isPlaceOpen && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <span className="h-2 w-2 mr-1 rounded-full bg-green-500"></span>
              Open Now
            </span>
          )}
          {isClosingSoon && (
            <span className="inline-flex items-center px-2 py-1 ml-2 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
              <span className="h-2 w-2 mr-1 rounded-full bg-amber-500"></span>
              Closing Soon
            </span>
          )}
          {!isPlaceOpen && !isClosingSoon && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              <span className="h-2 w-2 mr-1 rounded-full bg-gray-500"></span>
              Closed
            </span>
          )}
        </div>
      )}
      
      {loading ? (
        <p>Loading opening hours...</p>
      ) : formattedGroups && formattedGroups.length > 0 ? (
        <div className="bg-gray-50 p-2 rounded">
          <table className="w-full border-separate border-spacing-y-1">
            <tbody>
              {formattedGroups.map((item, index) => {
                // Check if this row contains the current day using our helper function
                const containsCurrentDay = isDayInGroup(item.dayText);
                
                return (
                  <tr key={index} className={containsCurrentDay && isPlaceOpen ? 'border-2 border-red-600 bg-red-50 shadow-md rounded' : ''}>
                    <td className={`pr-6 align-top ${containsCurrentDay ? 'font-medium' : ''}`}>{item.dayText}</td>
                    <td className={`align-top ${containsCurrentDay ? 'font-medium' : ''}`}>{formatTimeWithLeadingZeros(item.hours)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : fallbackText ? (
        <p className="text-sm text-gray-500">{fallbackText}</p>
      ) : (
        <div className="text-xs text-gray-500">Hours not available</div>
      )}
    </div>
  );
}

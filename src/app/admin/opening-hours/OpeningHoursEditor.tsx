'use client';

import { useState, useEffect } from 'react';
import { Place } from '@/lib/data-utils';
import { useRouter } from 'next/navigation';

// Default times that can be quickly selected
const DEFAULT_TIMES = [
  { open: '09:00', close: '17:00' },
  { open: '09:30', close: '17:30' },
  { open: '10:00', close: '18:00' },
  { open: '10:00', close: '17:00' },
  { open: 'By appointment only', close: '' },
  { open: 'Closed', close: '' }
];

const DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
];

interface OpeningHoursEditorProps {
  initialPlaces: Place[];
}

export default function OpeningHoursEditor({ initialPlaces }: OpeningHoursEditorProps) {
  const router = useRouter();
  const [places, setPlaces] = useState<Place[]>(initialPlaces);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [openingHours, setOpeningHours] = useState<OpeningHoursData>({});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [status, setStatus] = useState<{ message: string; type: 'success' | 'error' | 'info' | null }>({
    message: '',
    type: null
  });
  const [isLoading, setIsLoading] = useState(false);

  // Interface for our opening hours data structure
  interface OpeningHoursData {
    [day: number]: {
      open: string;
      close: string;
      is_closed: boolean;
      is_by_appointment: boolean;
    };
  }

  // When selected place changes, fetch its opening hours
  useEffect(() => {
    if (selectedPlace) {
      fetchOpeningHours(selectedPlace.id);
    } else {
      setOpeningHours({});
    }
  }, [selectedPlace]);

  // Fetch opening hours for a place
  const fetchOpeningHours = async (placeId: number) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/opening-hours?placeId=${placeId}`);
      if (!response.ok) throw new Error('Failed to fetch opening hours');
      
      const data = await response.json();
      console.log('Opening hours API response:', data);
      
      // Convert array to object with day as key
      const hoursObject: OpeningHoursData = {};
      
      // Check if data.raw exists and is an array (correct API format)
      if (data.raw && Array.isArray(data.raw)) {
        // Process the raw hours data
        data.raw.forEach((hour: any) => {
          hoursObject[hour.day_of_week] = {
            open: hour.open_time || '',
            close: hour.close_time || '',
            is_closed: hour.is_closed === 1 || hour.is_closed === true,
            is_by_appointment: hour.is_by_appointment === 1 || hour.is_by_appointment === true
          };
        });
      } else if (Array.isArray(data)) {
        // Fallback for legacy format (direct array)
        data.forEach((hour: any) => {
          hoursObject[hour.day_of_week] = {
            open: hour.open_time || '',
            close: hour.close_time || '',
            is_closed: hour.is_closed === 1 || hour.is_closed === true,
            is_by_appointment: hour.is_by_appointment === 1 || hour.is_by_appointment === true
          };
        });
      }
      
      // Initialize days that don't have data
      DAYS.forEach((_, index) => {
        if (!hoursObject[index]) {
          hoursObject[index] = {
            open: '',
            close: '',
            is_closed: false,
            is_by_appointment: false
          };
        }
      });
      
      console.log('Processed opening hours:', hoursObject);
      setOpeningHours(hoursObject);
    } catch (error) {
      console.error('Error fetching opening hours:', error);
      setStatus({
        message: 'Failed to fetch opening hours',
        type: 'error'
      });
      
      // Initialize empty hours for all days
      const emptyHours: OpeningHoursData = {};
      DAYS.forEach((_, index) => {
        emptyHours[index] = {
          open: '',
          close: '',
          is_closed: false,
          is_by_appointment: false
        };
      });
      setOpeningHours(emptyHours);
    } finally {
      setIsLoading(false);
    }
  };

  // Navigate to places view with cache busting parameter
  const viewUpdatedPlaces = () => {
    // Add timestamp to force refresh of data
    const timestamp = Date.now();
    router.push(`/?refresh=${timestamp}`);
  };

  // Handle save of opening hours
  const saveOpeningHours = async () => {
    if (!selectedPlace) return;
    
    setIsLoading(true);
    setSaveSuccess(false); // Reset success state
    
    try {
      // Convert our object format back to array for API
      const hoursArray = Object.entries(openingHours).map(([day, data]) => ({
        place_id: selectedPlace.id,
        day_of_week: parseInt(day),
        open_time: data.is_closed || data.is_by_appointment ? null : data.open,
        close_time: data.is_closed || data.is_by_appointment ? null : data.close,
        is_closed: data.is_closed,
        is_by_appointment: data.is_by_appointment,
        notes: ''
      }));
      
      const response = await fetch('/api/opening-hours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeId: selectedPlace.id, hours: hoursArray })
      });
      
      if (!response.ok) throw new Error('Failed to save opening hours');
      
      setStatus({
        message: 'Opening hours saved successfully',
        type: 'success'
      });
      setSaveSuccess(true); // Mark save as successful
    } catch (error) {
      console.error('Error saving opening hours:', error);
      setStatus({
        message: 'Failed to save opening hours',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Delete all opening hours for a place
  const deleteAllHours = async () => {
    if (!selectedPlace || !window.confirm('Are you sure you want to delete ALL opening hours for this place?')) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/opening-hours?placeId=${selectedPlace.id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete opening hours');
      
      // Reset to empty hours
      const emptyHours: OpeningHoursData = {};
      DAYS.forEach((_, index) => {
        emptyHours[index] = {
          open: '',
          close: '',
          is_closed: false,
          is_by_appointment: false
        };
      });
      setOpeningHours(emptyHours);
      
      setStatus({
        message: 'All opening hours deleted',
        type: 'info'
      });
    } catch (error) {
      console.error('Error deleting opening hours:', error);
      setStatus({
        message: 'Failed to delete opening hours',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Apply a preset to all weekdays (Monday-Friday)
  const applyWeekdayPreset = (preset: { open: string; close: string }) => {
    if (!selectedPlace) return;
    
    const updatedHours = { ...openingHours };
    
    // Apply to Monday-Friday (1-5)
    for (let day = 1; day <= 5; day++) {
      updatedHours[day] = {
        ...updatedHours[day],
        open: preset.open,
        close: preset.close,
        is_closed: preset.open === 'Closed',
        is_by_appointment: preset.open === 'By appointment only'
      };
    }
    
    setOpeningHours(updatedHours);
  };

  // Apply a preset to weekends (Saturday and Sunday)
  const applyWeekendPreset = (preset: { open: string; close: string }) => {
    if (!selectedPlace) return;
    
    const updatedHours = { ...openingHours };
    
    // Apply to Saturday (6) and Sunday (0)
    for (let day of [0, 6]) {
      updatedHours[day] = {
        ...updatedHours[day],
        open: preset.open,
        close: preset.close,
        is_closed: preset.open === 'Closed',
        is_by_appointment: preset.open === 'By appointment only'
      };
    }
    
    setOpeningHours(updatedHours);
  };

  // Update a specific day's hours
  const updateDayHours = (day: number, field: 'open' | 'close', value: string) => {
    // Remove any leading zeros from times
    let cleanValue = value;
    if (cleanValue.match(/^0\d/)) {
      cleanValue = cleanValue.substring(1);
    }
    
    setOpeningHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: cleanValue,
        // Auto-update closed and appointment statuses
        is_closed: field === 'open' && cleanValue === 'Closed' ? true : prev[day].is_closed,
        is_by_appointment: field === 'open' && cleanValue === 'By appointment only' ? true : prev[day].is_by_appointment
      }
    }));
  };

  // Set a day as closed
  const setDayClosed = (day: number, isClosed: boolean) => {
    setOpeningHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        is_closed: isClosed,
        is_by_appointment: false
      }
    }));
  };

  // Set a day as by appointment only
  const setDayByAppointment = (day: number, isByAppointment: boolean) => {
    setOpeningHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        is_by_appointment: isByAppointment,
        is_closed: false
      }
    }));
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-6">
        <label htmlFor="placeSelect" className="block text-sm font-medium text-gray-700 mb-1">
          Select Place
        </label>
        <select
          id="placeSelect"
          className="w-full border border-gray-300 rounded-md py-2 px-3"
          value={selectedPlace?.id || ''}
          onChange={(e) => {
            const placeId = parseInt(e.target.value);
            setSelectedPlace(places.find(p => p.id === placeId) || null);
          }}
        >
          <option value="">-- Select a place --</option>
          {places.map(place => (
            <option key={place.id} value={place.id}>
              {place.name}
            </option>
          ))}
        </select>
      </div>
      
      {selectedPlace && (
        <>
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">Quick Settings</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <button
                className="btn-secondary text-sm p-2"
                onClick={() => applyWeekdayPreset({ open: '09:00', close: '17:00' })}
              >
                Set Weekdays 9AM-5PM
              </button>
              <button
                className="btn-secondary text-sm p-2"
                onClick={() => applyWeekdayPreset({ open: '10:00', close: '18:00' })}
              >
                Set Weekdays 10AM-6PM
              </button>
              <button
                className="btn-secondary text-sm p-2"
                onClick={() => applyWeekdayPreset({ open: 'By appointment only', close: '' })}
              >
                Set Weekdays By Appointment
              </button>
              <button
                className="btn-secondary text-sm p-2"
                onClick={() => applyWeekendPreset({ open: 'By appointment only', close: '' })}
              >
                Set Weekends By Appointment
              </button>
              <button
                className="btn-danger text-sm p-2"
                onClick={deleteAllHours}
                disabled={isLoading}
              >
                Delete All Hours
              </button>
            </div>
          </div>
          
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">Opening Hours</h2>
            <div className="space-y-2">
              {DAYS.map((day, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-2 p-2 border-b border-gray-200">
                  <div className="md:col-span-2 flex items-center">
                    <span className="font-medium">{day}</span>
                  </div>
                  <div className="md:col-span-10 grid grid-cols-1 sm:grid-cols-5 gap-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`closed-${index}`}
                        checked={openingHours[index]?.is_closed || false}
                        onChange={(e) => setDayClosed(index, e.target.checked)}
                      />
                      <label htmlFor={`closed-${index}`}>Closed</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`appointment-${index}`}
                        checked={openingHours[index]?.is_by_appointment || false}
                        onChange={(e) => setDayByAppointment(index, e.target.checked)}
                      />
                      <label htmlFor={`appointment-${index}`}>By Appointment</label>
                    </div>
                    <div className="flex items-center">
                      <label htmlFor={`open-${index}`} className="mr-2 text-sm">Opens:</label>
                      <input
                        type="text"
                        id={`open-${index}`}
                        className="border border-gray-300 rounded p-1 w-24"
                        value={openingHours[index]?.open || ''}
                        placeholder="e.g. 9:00"
                        onChange={(e) => updateDayHours(index, 'open', e.target.value)}
                        disabled={openingHours[index]?.is_closed || openingHours[index]?.is_by_appointment}
                      />
                    </div>
                    <div className="flex items-center">
                      <label htmlFor={`close-${index}`} className="mr-2 text-sm">Closes:</label>
                      <input
                        type="text"
                        id={`close-${index}`}
                        className="border border-gray-300 rounded p-1 w-24"
                        value={openingHours[index]?.close || ''}
                        placeholder="e.g. 5:00"
                        onChange={(e) => updateDayHours(index, 'close', e.target.value)}
                        disabled={openingHours[index]?.is_closed || openingHours[index]?.is_by_appointment}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <select
                        className="border border-gray-300 rounded p-1 text-sm"
                        onChange={(e) => {
                          const preset = DEFAULT_TIMES[parseInt(e.target.value)];
                          updateDayHours(index, 'open', preset.open);
                          updateDayHours(index, 'close', preset.close);
                          setDayClosed(index, preset.open === 'Closed');
                          setDayByAppointment(index, preset.open === 'By appointment only');
                          e.target.value = '';
                        }}
                        value=""
                      >
                        <option value="">Presets</option>
                        {DEFAULT_TIMES.map((time, i) => (
                          <option key={i} value={i}>
                            {time.open}{time.close ? `-${time.close}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="mt-6 flex justify-end space-x-4">
            <button
              className="btn-primary"
              onClick={saveOpeningHours}
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : 'Save Opening Hours'}
            </button>
            
            {saveSuccess && (
              <button
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
                onClick={viewUpdatedPlaces}
              >
                View Updated Places
              </button>
            )}
          </div>
          
          {status.message && (
            <div className={`mt-4 p-3 rounded ${
              status.type === 'success' ? 'bg-green-100 text-green-800' :
              status.type === 'error' ? 'bg-red-100 text-red-800' :
              'bg-blue-100 text-blue-800'
            }`}>
              {status.message}
            </div>
          )}
        </>
      )}
    </div>
  );
}

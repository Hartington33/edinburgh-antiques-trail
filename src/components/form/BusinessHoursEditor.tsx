'use client';

import React, { useState } from 'react';
import { OpeningHour } from '@/lib/data-utils';
import TimePickerDropdown from './TimePickerDropdown';

interface BusinessHoursEditorProps {
  openingHours: OpeningHour[];
  onChange: (hours: OpeningHour[]) => void;
  placeId?: number;
}

export default function BusinessHoursEditor({
  openingHours: initialHours,
  onChange,
  placeId = 0,
}: BusinessHoursEditorProps) {
  // Initialize with default hours if none provided
  const [hours, setHours] = useState<OpeningHour[]>(() => {
    if (initialHours && initialHours.length === 7) {
      return initialHours;
    }
    
    // Default structure - one entry for each day of week
    return Array.from({ length: 7 }, (_, i) => ({
      place_id: placeId,
      day_of_week: i, // 0 = Monday, 1 = Tuesday, ..., 6 = Sunday
      open_time: null,
      close_time: null,
      is_closed: i === 6, // Default Sunday to closed
      is_by_appointment: false,
      notes: null,
    }));
  });
  
  const days = [
    "Monday", "Tuesday", "Wednesday", "Thursday", 
    "Friday", "Saturday", "Sunday"
  ];
  
  // Sort hours array to ensure days display in correct order (Monday first)
  const sortedHours = [...hours].sort((a, b) => a.day_of_week - b.day_of_week);
  
  // Handle changes to a specific day
  const handleDayChange = (index: number, field: keyof OpeningHour, value: any) => {
    // Get the actual day of week from the sorted array
    const dayOfWeek = sortedHours[index].day_of_week;
    
    // Find the corresponding index in the original hours array
    const actualIndex = hours.findIndex(h => h.day_of_week === dayOfWeek);
    if (actualIndex === -1) return; // Safety check
    
    const updatedHours = [...hours];
    
    // Special logic for checkboxes
    if (field === 'is_closed') {
      updatedHours[actualIndex].is_closed = value;
      
      // If marked as closed, clear times
      if (value) {
        updatedHours[actualIndex].open_time = null;
        updatedHours[actualIndex].close_time = null;
        updatedHours[actualIndex].is_by_appointment = false;
      }
    } else if (field === 'is_by_appointment') {
      updatedHours[actualIndex].is_by_appointment = value;
      
      // If by appointment, clear regular hours
      if (value) {
        updatedHours[actualIndex].open_time = null;
        updatedHours[actualIndex].close_time = null;
        updatedHours[actualIndex].is_closed = false;
      }
    } else {
      // For other fields (times, notes)
      (updatedHours[actualIndex] as any)[field] = value;
    }
    
    setHours(updatedHours);
    onChange(updatedHours);
  };
  
  // Quick template buttons for common hours
  const applyTemplate = (template: 'business' | 'weekend' | 'closed') => {
    const updatedHours = [...hours];
    
    if (template === 'business') {
      // Mon-Fri 9-5 (days 0-4)
      updatedHours.forEach(day => {
        // If Monday through Friday (0-4)
        if (day.day_of_week >= 0 && day.day_of_week <= 4) {
          day.open_time = '09:00';
          day.close_time = '17:00';
          day.is_closed = false;
          day.is_by_appointment = false;
        }
      });
    } else if (template === 'weekend') {
      // Sat-Sun closed (days 5-6)
      updatedHours.forEach(day => {
        // If Saturday or Sunday (5-6)
        if (day.day_of_week === 5 || day.day_of_week === 6) {
          day.is_closed = true;
          day.open_time = null;
          day.close_time = null;
          day.is_by_appointment = false;
        }
      });
    } else if (template === 'closed') {
      // All days closed
      updatedHours.forEach(day => {
        day.is_closed = true;
        day.open_time = null;
        day.close_time = null;
        day.is_by_appointment = false;
      });
    }
    
    setHours(updatedHours);
    onChange(updatedHours);
  };
  
  // Validate time - check if closing time is after opening time
  const validateTime = (
    index: number, 
    field: 'open_time' | 'close_time', 
    value: string | null
  ): string | null => {
    if (!value) return null;
    
    // Get the actual day from the sortedHours array
    const day = sortedHours[index];
    if (!day) return null;
    
    // Check if closing time is after opening time
    if (field === 'close_time' && day.open_time) {
      const [openHour, openMinute] = day.open_time.split(':').map(Number);
      const [closeHour, closeMinute] = value.split(':').map(Number);
      
      if (closeHour < openHour || (closeHour === openHour && closeMinute <= openMinute)) {
        return 'Closing time must be after opening time';
      }
    }
    
    return null;
  };
  
  return (
    <div className="business-hours-editor">
      <div className="mb-4 flex flex-wrap gap-2">
        <button 
          type="button" 
          className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          onClick={() => applyTemplate('business')}
        >
          Set Weekday Hours (9-5)
        </button>
        <button 
          type="button" 
          className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          onClick={() => applyTemplate('weekend')}
        >
          Close Weekends
        </button>
        <button 
          type="button" 
          className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          onClick={() => applyTemplate('closed')}
        >
          Close All Days
        </button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left px-4 py-2">Day</th>
              <th className="text-left px-4 py-2">Hours</th>
              <th className="text-left px-4 py-2">Status</th>
              <th className="text-left px-4 py-2">Notes</th>
            </tr>
          </thead>
          <tbody>
            {sortedHours.map((day, index) => {
              const openTimeError = validateTime(index, 'open_time', day.open_time);
              const closeTimeError = validateTime(index, 'close_time', day.close_time);
              
              return (
                <tr key={index} className="border-b border-gray-200">
                  <td className="px-4 py-3 font-medium">{days[day.day_of_week]}</td>
                  <td className="px-4 py-3">
                    {!day.is_closed && !day.is_by_appointment && (
                      <div className="flex items-center space-x-2">
                        <div className="flex flex-col w-32">
                          <TimePickerDropdown
                            value={day.open_time || null}
                            onChange={(time) => handleDayChange(index, 'open_time', time)}
                            disabled={day.is_closed || day.is_by_appointment}
                            error={openTimeError}
                          />
                        </div>
                        <span>to</span>
                        <div className="flex flex-col w-32">
                          <TimePickerDropdown
                            value={day.close_time || null}
                            onChange={(time) => handleDayChange(index, 'close_time', time)}
                            disabled={day.is_closed || day.is_by_appointment}
                            error={closeTimeError}
                          />
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          className="mr-2"
                          checked={day.is_closed}
                          onChange={(e) => handleDayChange(index, 'is_closed', e.target.checked)}
                        />
                        Closed
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          className="mr-2"
                          checked={day.is_by_appointment}
                          onChange={(e) => handleDayChange(index, 'is_by_appointment', e.target.checked)}
                        />
                        By Appointment
                      </label>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      className="w-full px-2 py-1 border border-gray-300 rounded"
                      placeholder="Special notes for this day"
                      value={day.notes || ''}
                      onChange={(e) => handleDayChange(index, 'notes', e.target.value)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      <div className="mt-4 text-sm text-gray-500">
        <p className="mt-1">
          <span className="font-medium">Notes:</span> Can be used for information like "Early closing" or "By appointment after 4pm"
        </p>
      </div>
    </div>
  );
}

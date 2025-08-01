'use client';

import React from 'react';

interface TimeOption {
  value: string;
  label: string;
}

interface TimePickerDropdownProps {
  value: string | null;
  onChange: (time: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  error?: string | null;
}

export default function TimePickerDropdown({
  value,
  onChange,
  onBlur,
  disabled = false,
  error
}: TimePickerDropdownProps) {
  // Generate time options from 8am to 9pm in 30-minute increments
  const generateTimeOptions = (): TimeOption[] => {
    const options: TimeOption[] = [];
    
    // Start at 8:00 AM (8 hours)
    for (let hour = 8; hour <= 21; hour++) {
      // Add hour:00
      options.push({
        value: `${hour.toString().padStart(2, '0')}:00`,
        label: `${hour === 12 ? 12 : hour % 12}:00 ${hour < 12 ? 'AM' : 'PM'}`
      });
      
      // Add hour:30
      options.push({
        value: `${hour.toString().padStart(2, '0')}:30`,
        label: `${hour === 12 ? 12 : hour % 12}:30 ${hour < 12 ? 'AM' : 'PM'}`
      });
    }
    
    return options;
  };
  
  const timeOptions = generateTimeOptions();
  
  // For display purposes - convert 24h format to 12h format
  const formatDisplayTime = (time24h: string | null): string => {
    if (!time24h) return '';
    
    const [hourStr, minute] = time24h.split(':');
    const hour = parseInt(hourStr);
    
    if (isNaN(hour)) return time24h;
    
    const ampm = hour >= 12 ? 'pm' : 'am';
    const hour12 = hour % 12 || 12; // Convert to 12-hour format
    
    return `${hour12}:${minute}${ampm}`;
  };
  
  return (
    <div className="relative">
      <select
        className={`w-full px-3 py-2 border ${error ? 'border-red-300' : 'border-gray-300'} rounded-md focus:border-edinburgh-blue focus:ring focus:ring-edinburgh-blue/20 appearance-none`}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        disabled={disabled}
      >
        <option value="">Select time</option>
        {timeOptions.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
          <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
        </svg>
      </div>
      
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}

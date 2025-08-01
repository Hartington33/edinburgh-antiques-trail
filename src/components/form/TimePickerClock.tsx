'use client';

import React, { useState, useEffect } from 'react';

interface TimePickerClockProps {
  value: string | null;
  onChange: (time: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  error?: string | null;
}

export default function TimePickerClock({
  value,
  onChange,
  onBlur,
  disabled = false,
  error
}: TimePickerClockProps) {
  const [hours, setHours] = useState<number>(9); // Default to 9am
  const [minutes, setMinutes] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'hours' | 'minutes'>('hours');
  
  // Parse the input value when it changes
  useEffect(() => {
    if (value) {
      const [hoursStr, minutesStr] = value.split(':');
      const parsedHours = parseInt(hoursStr);
      const parsedMinutes = parseInt(minutesStr);
      
      if (!isNaN(parsedHours)) setHours(parsedHours);
      if (!isNaN(parsedMinutes)) setMinutes(parsedMinutes);
    }
  }, [value]);
  
  // Format hours and minutes with leading zeros
  const formattedHours = hours.toString().padStart(2, '0');
  const formattedMinutes = minutes.toString().padStart(2, '0');
  const formattedTime = `${formattedHours}:${formattedMinutes}`;
  
  // Handle hour selection
  const handleHourClick = (hour: number) => {
    setHours(hour);
    setViewMode('minutes');
  };
  
  // Handle minute selection
  const handleMinuteClick = (minute: number) => {
    setMinutes(minute);
    onChange(`${formattedHours}:${minute.toString().padStart(2, '0')}`);
    setIsOpen(false);
    if (onBlur) onBlur();
  };
  
  // Toggle the clock dropdown
  const toggleClock = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      setViewMode('hours');
    }
  };
  
  // Close the clock when clicking outside
  const handleClickOutside = () => {
    setIsOpen(false);
    if (onBlur) onBlur();
  };
  
  // Generate hour markers
  const hourMarkers: React.ReactNode[] = [];
  for (let i = 0; i < 24; i++) {
    const angle = (i / 24) * 360;
    const isSelected = i === hours;
    
    hourMarkers.push(
      <div
        key={`hour-${i}`}
        className={`absolute transform -translate-x-1/2 -translate-y-1/2 rounded-full w-8 h-8 flex items-center justify-center cursor-pointer
          ${isSelected ? 'bg-edinburgh-blue text-white' : 'hover:bg-gray-100'}`}
        style={{
          left: `${50 + 40 * Math.sin((angle * Math.PI) / 180)}%`,
          top: `${50 - 40 * Math.cos((angle * Math.PI) / 180)}%`,
        }}
        onClick={() => handleHourClick(i)}
      >
        {i}
      </div>
    );
  }
  
  // Generate minute markers (in 5-minute increments)
  const minuteMarkers: React.ReactNode[] = [];
  for (let i = 0; i < 60; i += 5) {
    const angle = (i / 60) * 360;
    const isSelected = Math.abs(i - minutes) < 5;
    
    minuteMarkers.push(
      <div
        key={`minute-${i}`}
        className={`absolute transform -translate-x-1/2 -translate-y-1/2 rounded-full w-8 h-8 flex items-center justify-center cursor-pointer
          ${isSelected ? 'bg-edinburgh-blue text-white' : 'hover:bg-gray-100'}`}
        style={{
          left: `${50 + 40 * Math.sin((angle * Math.PI) / 180)}%`,
          top: `${50 - 40 * Math.cos((angle * Math.PI) / 180)}%`,
        }}
        onClick={() => handleMinuteClick(i)}
      >
        {i.toString().padStart(2, '0')}
      </div>
    );
  }
  
  return (
    <div className="relative">
      <div className="relative">
        <input
          type="text"
          className={`w-full px-3 py-2 border ${error ? 'border-red-300' : 'border-gray-300'} rounded-md focus:border-edinburgh-blue focus:ring focus:ring-edinburgh-blue/20`}
          placeholder="HH:MM"
          value={value || ''}
          onClick={toggleClock}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          disabled={disabled}
          readOnly
        />
        <div 
          className="absolute right-2 top-1/2 transform -translate-y-1/2 cursor-pointer"
          onClick={toggleClock}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>
      
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      
      {isOpen && (
        <div className="absolute z-10 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4 w-64">
          <div className="flex justify-between mb-2">
            <button
              className={`px-2 py-1 rounded ${viewMode === 'hours' ? 'bg-edinburgh-blue text-white' : 'bg-gray-100'}`}
              onClick={() => setViewMode('hours')}
            >
              Hours
            </button>
            <button
              className={`px-2 py-1 rounded ${viewMode === 'minutes' ? 'bg-edinburgh-blue text-white' : 'bg-gray-100'}`}
              onClick={() => setViewMode('minutes')}
            >
              Minutes
            </button>
            <button
              className="px-2 py-1 bg-gray-200 rounded"
              onClick={handleClickOutside}
            >
              Done
            </button>
          </div>
          
          <div className="relative h-48 w-48 mx-auto bg-gray-50 rounded-full">
            {/* Center dot */}
            <div className="absolute left-1/2 top-1/2 w-2 h-2 bg-edinburgh-blue rounded-full transform -translate-x-1/2 -translate-y-1/2"></div>
            
            {/* Clock hand */}
            <div 
              className="absolute left-1/2 top-1/2 bg-edinburgh-blue h-0.5 origin-left"
              style={{
                width: '40%',
                transform: `rotate(${viewMode === 'hours' 
                  ? (hours / 24) * 360
                  : (minutes / 60) * 360
                }deg)`,
              }}
            ></div>
            
            {/* Time markers */}
            {viewMode === 'hours' ? hourMarkers : minuteMarkers}
          </div>
          
          <div className="text-center mt-4 text-lg font-semibold">
            {formattedTime}
          </div>
          
          <div className="flex justify-center gap-4 mt-2">
            <button 
              className="px-3 py-1 bg-edinburgh-blue text-white rounded hover:bg-edinburgh-blue/90"
              onClick={() => {
                onChange(formattedTime);
                setIsOpen(false);
                if (onBlur) onBlur();
              }}
            >
              Set Time
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

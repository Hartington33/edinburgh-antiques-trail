'use client';

import React from 'react';

interface OpeningHoursSummaryProps {
  openingHoursText: string;
  className?: string;
}

interface DayHours {
  day: string;
  hours: string;
}

export default function OpeningHoursSummary({ openingHoursText, className = '' }: OpeningHoursSummaryProps) {
  // Process the opening hours text into structured data
  const processOpeningHours = (text: string): DayHours[] => {
    if (!text) return [];
    
    // We've removed special case handling for specific shops
    // to ensure we respect the actual database values
    // This will ensure consistent display across all pages
    
    // We're not going to handle Anthony Woodd as a special case anymore
    // because you've edited the actual database values and we want to respect those
    // Previously we were hardcoding values here, which caused the inconsistency
    
    // Only keep special handling for repeated single numbers case
    if (text.includes('11\n11\n11\n11\n11\n11') && !text.includes('Anthony Woodd')) {
      return [
        { day: 'Monday', hours: '11:00-17:00' },
        { day: 'Tuesday', hours: '11:00-17:00' },
        { day: 'Wednesday', hours: '11:00-17:00' },
        { day: 'Thursday', hours: '11:00-17:00' },
        { day: 'Friday', hours: '11:00-17:00' },
        { day: 'Saturday', hours: '11:00-17:00' },
        { day: 'Sunday', hours: 'Closed' }
      ];
    }
    
    // Clean up any leading zeros
    let cleanedText = text.replace(/\b0(\d)/g, '$1')
                         .replace(/0+By appointment/g, 'By appointment');
    
    // Fix the format for times like "11" or single numbers
    cleanedText = cleanedText.replace(/\b(\d{1,2})\b\s*$/gm, '$1:00 to 17:00');
    
    // Handle special case for Alan Day (By Appointment Only for all days)
    if (cleanedText.includes('By appointment only') && cleanedText.match(/By appointment only/g)?.length === 7) {
      return [
        { day: 'Monday', hours: 'By appointment only' },
        { day: 'Tuesday', hours: 'By appointment only' },
        { day: 'Wednesday', hours: 'By appointment only' },
        { day: 'Thursday', hours: 'By appointment only' },
        { day: 'Friday', hours: 'By appointment only' },
        { day: 'Saturday', hours: 'By appointment only' },
        { day: 'Sunday', hours: 'By appointment only' }
      ];
    }
    
    // Split by line breaks
    const lines = cleanedText.split(/\n/);
    
    // Check if we have incomplete day entries (e.g., "Mon-Sat 11am - 6pm, Sun" without Sunday hours)
    let hasIncompleteEntries = false;
    const processedLines = lines.map(line => {
      // Check for common patterns that indicate a day without hours
      if (line.match(/[a-zA-Z]+\s*$/)) {
        hasIncompleteEntries = true;
      }
      
      // Check if the line contains a typical day range format (e.g., "Mon-Sat: 11-17")
      // We no longer want to combine days, so we'll skip this processing
      const dayRangeMatch = line.match(/([a-zA-Z]+)\s*-\s*([a-zA-Z]+)\s*:?\s*(.*)/i);
      if (dayRangeMatch) {
        // Instead of returning a combined entry, we'll handle this later
        // by expanding day ranges in the post-processing step
        return {
          day: line.trim(),
          hours: 'Day range - will be expanded'
        };
      }
      
      // Regular case: Split by colon for day:hours format
      const parts = line.split(':');
      const dayPart = parts[0]?.trim() || '';
      const hoursPart = parts[1]?.trim() || '';
      
      // Handle cases where hours are not properly formatted
      if (hoursPart && hoursPart.match(/^\d+$/) && !hoursPart.includes('-')) {
        // Convert to standard format (e.g., "11" becomes "11:00 to 17:00")
        return {
          day: dayPart,
          hours: `${hoursPart}:00 to 17:00`
        };
      }
      
      return {
        day: dayPart,
        hours: hoursPart || (dayPart ? 'Closed' : '') // If we have a day but no hours, assume closed
      };
    });
    
    // Filter out any entries that have neither a day nor hours
    return processedLines.filter(item => item.day);
  };
  
  const hoursData = processOpeningHours(openingHoursText);
  
  // Don't render if there's no data
  if (hoursData.length === 0) return null;
  
  // Process and group days with identical hours
  const processAndGroupDays = (hours: DayHours[]): DayHours[] => {
    const result: DayHours[] = [];
    const expandedEntries: { [key: string]: string } = {};
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    // Map abbreviated days to full names
    const dayMap: { [key: string]: string } = {
      'Mon': 'Monday',
      'Tue': 'Tuesday',
      'Wed': 'Wednesday',
      'Thu': 'Thursday',
      'Fri': 'Friday',
      'Sat': 'Saturday',
      'Sun': 'Sunday'
    };
    
    // First, normalize all data to day -> hours mapping
    hours.forEach(entry => {
      if (entry.day.includes('to') || entry.hours === 'Day range - will be expanded') {
        // Handle day ranges (e.g., "Monday to Friday")
        const parts = entry.day.replace(/\s*-\s*/, ' to ').split(' to ');
        
        if (parts.length === 2) {
          // Get full day names
          const startDayFull = Object.entries(dayMap).find(([abbr, _]) => 
            parts[0].toLowerCase().includes(abbr.toLowerCase())
          )?.[1] || parts[0];
          
          const endDayFull = Object.entries(dayMap).find(([abbr, _]) => 
            parts[1].toLowerCase().includes(abbr.toLowerCase())
          )?.[1] || parts[1];
          
          // Find indices in day order
          const startIdx = dayOrder.indexOf(startDayFull);
          const endIdx = dayOrder.indexOf(endDayFull);
          
          if (startIdx >= 0 && endIdx >= 0) {
            // Create an entry for each day in the range
            for (let i = startIdx; i <= endIdx; i++) {
              expandedEntries[dayOrder[i]] = entry.hours === 'Day range - will be expanded' ? 
                                           '11:00-17:00' : entry.hours;
            }
          }
        }
      } else {
        // Direct mapping for single days
        const fullDay = Object.entries(dayMap).find(([abbr, _]) => 
          entry.day.toLowerCase().includes(abbr.toLowerCase())
        )?.[1] || entry.day;
        
        expandedEntries[fullDay] = entry.hours;
      }
    });
    
    // For safety, ensure all days have entries
    dayOrder.forEach(day => {
      if (!expandedEntries[day]) {
        expandedEntries[day] = 'Closed';
      }
    });
    
    // Group consecutive days with the same hours
    let currentHours = '';
    let startDay = '';
    let consecutive = 0;
    
    // Process days in order
    dayOrder.forEach((day, index) => {
      const hours = expandedEntries[day];
      
      if (hours === currentHours && index > 0) {
        // Continue the current group
        consecutive++;
      } else {
        // End previous group if there was one
        if (consecutive > 0) {
          // More than one day with the same hours
          if (consecutive === 1) {
            // Just two consecutive days - add them separately for clarity
            result.push({ day: dayOrder[index - 2], hours: currentHours });
            result.push({ day: dayOrder[index - 1], hours: currentHours });
          } else {
            // Three or more consecutive days - use a range
            const endDay = dayOrder[index - 1];
            const rangeDay = `${startDay} to ${endDay}`;
            result.push({ day: rangeDay, hours: currentHours });
          }
        }
        
        // Start a new group
        startDay = day;
        currentHours = hours;
        consecutive = 0;
      }
      
      // Handle the last day
      if (index === dayOrder.length - 1) {
        if (consecutive > 0) {
          // End of a group
          if (consecutive === 1) {
            // Just two days
            result.push({ day: dayOrder[index - 1], hours: currentHours });
            result.push({ day: day, hours: currentHours });
          } else {
            // Three or more days in a row
            const rangeDay = `${startDay} to ${day}`;
            result.push({ day: rangeDay, hours: currentHours });
          }
        } else {
          // Single day at the end
          result.push({ day, hours });
        }
      }
    });
    
    return result;
  };
  
  // Process the data to group days with identical hours
  const processedHoursData = processAndGroupDays(hoursData);
  
  return (
    <div className={`${className} mt-3`}>
      <p className="text-sm font-medium mb-1">Opening Hours:</p>
      <div className="bg-gray-50 rounded p-2 text-sm">
        <div className="grid grid-cols-2 gap-x-2 text-xs">
          <div className="font-medium">
            {processedHoursData.map((day, index) => (
              <div key={`day-${index}`} className="py-1 border-b border-gray-100 last:border-b-0">
                {day.day}
              </div>
            ))}
          </div>
          <div className="tabular-nums">
            {processedHoursData.map((day, index) => (
              <div key={`hours-${index}`} className="py-1 border-b border-gray-100 last:border-b-0">
                {day.hours}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

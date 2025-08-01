'use client';

import { useState } from 'react';

// Simple interface for opening hours
interface OpeningHour {
  day_of_week: number;
  open_time?: string | null;
  close_time?: string | null;
  is_closed?: boolean;
  is_by_appointment?: boolean;
  notes?: string | null;
}

// Props for the component
interface OpeningHoursDisplayProps {
  openingHours: OpeningHour[];
  className?: string;
}

// Days of the week
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function OpeningHoursDisplay({ openingHours, className = '' }: OpeningHoursDisplayProps) {
  // State to track today for highlighting
  const [today] = useState(new Date().getDay());

  // Function to format a single day's hours
  function formatHours(hour: OpeningHour): string {
    // Add null/undefined check
    if (!hour) {
      return 'Hours not available';
    }
    
    if (hour.is_closed) {
      return 'Closed';
    }
    
    if (hour.is_by_appointment) {
      return 'By appointment only';
    }
    
    if (hour.open_time && hour.close_time) {
      // Format opening hours without leading zeros but maintain 24-hour format
      const openTime = hour.open_time.replace(/^0(\d)/, '$1');
      const closeTime = hour.close_time.replace(/^0(\d)/, '$1');
      // Very clear spacing and formatting with the word "to"
      return `${openTime} TO ${closeTime}`;
    }
    
    return 'Hours not specified';
  }
  
  // Define the type for grouped hours
  type GroupedHour = {
    days: string;
    hours: string;
    isToday: boolean;
  };

  // Define the type for day groups
  interface DayGroup {
    startDay: number;
    endDay: number;
    hours: string;
  }
  
  // Group similar days together for more concise display
  function groupSimilarDays(hours: OpeningHour[]): GroupedHour[] {
    if (!hours || hours.length === 0) return [];
    
    // Format a day range (e.g. "Monday to Friday" or just "Saturday")
    function formatDayRange(startDay: number, endDay: number): string {
      // Use Monday-first day names
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      
      if (startDay === endDay) {
        return days[startDay];
      }
      
      return `${days[startDay]} to ${days[endDay]}`;
    }
    
    // Convert JS getDay() (0=Sunday) to our day (0=Monday)
    const jsDay = new Date().getDay();
    const today = jsDay === 0 ? 6 : jsDay - 1; // Convert JS day to our day
    
    // Convert the DB days (0=Sunday) to our new order (0=Monday)
    const reorderedHours = hours.map(hour => ({
      ...hour,
      day_of_week: hour.day_of_week === 0 ? 6 : hour.day_of_week - 1
    }));
    
    // Sort hours by our new day order
    const sortedHours = [...reorderedHours].sort((a, b) => a.day_of_week - b.day_of_week);
    
    // Handle special case: if all days have the same hours
    if (sortedHours.length === 7) {
      const sampleHours = formatHours(sortedHours[0]);
      const allSame = sortedHours.every(h => formatHours(h) === sampleHours);
      
      if (allSame) {
        return [{
          days: 'Every day',
          hours: sampleHours,
          isToday: true // Always highlight as today since it applies to every day
        }];
      }
    }
    
    // Group weekdays and weekend separately if they have consistent hours
    // In our new ordering: 0-4 are Monday-Friday, 5-6 are Saturday-Sunday
    const weekdays = sortedHours.filter(h => h.day_of_week >= 0 && h.day_of_week <= 4);
    const weekend = sortedHours.filter(h => h.day_of_week === 5 || h.day_of_week === 6);
    
    if (weekdays.length === 5 && weekend.length === 2) {
      // Check if all weekdays have the same hours
      const weekdaysSame = weekdays.every(hour => 
        formatHours(hour) === formatHours(weekdays[0]));
        
      // Check if both weekend days have the same hours
      const weekendSame = weekend.length === 2 && 
        formatHours(weekend[0]) === formatHours(weekend[1]);
      
      if (weekdaysSame && weekendSame) {
        const result = [
          {
            days: 'Monday to Friday',
            hours: formatHours(weekdays[0]),
            isToday: today >= 0 && today <= 4
          },
          {
            days: 'Saturday to Sunday',
            hours: formatHours(weekend[0]),
            isToday: today === 5 || today === 6
          }
        ];
        
        return result;
      }
    }
    
    // For remaining days, group consecutive days with same hours
    let result: GroupedHour[] = [];
    let currentGroup: DayGroup | null = null;
    
    sortedHours.forEach(hour => {
      const hourString = formatHours(hour);
      
      if (!currentGroup) {
        // Start a new group
        currentGroup = {
          startDay: hour.day_of_week,
          endDay: hour.day_of_week,
          hours: hourString
        };
      } else if (hour.day_of_week === currentGroup.endDay + 1 && hourString === currentGroup.hours) {
        // Extend current group
        currentGroup.endDay = hour.day_of_week;
      } else {
        // End current group and create a new one
        const days = formatDayRange(currentGroup.startDay, currentGroup.endDay);
        result.push({
          days,
          hours: currentGroup.hours,
          isToday: today >= currentGroup.startDay && today <= currentGroup.endDay
        });
        
        currentGroup = {
          startDay: hour.day_of_week,
          endDay: hour.day_of_week,
          hours: hourString
        };
      }
    });
    
    // Add the last group
    if (currentGroup) {
      const days = formatDayRange(currentGroup.startDay, currentGroup.endDay);
      result.push({
        days,
        hours: currentGroup.hours,
        isToday: today >= currentGroup.startDay && today <= currentGroup.endDay
      });
    }
    
    return result;
  }
  
  // Process hours into grouped format
  const groupedHours = groupSimilarDays(openingHours);

  return (
    <div className={`mt-4 ${className}`}>
      <h3 className="text-lg font-semibold mb-2">Opening Hours</h3>
      <div className="bg-gray-50 p-3 rounded">
        <table className="w-full border-separate border-spacing-y-1">
          <tbody>
            {groupedHours.map((group, index) => (
              <tr 
                key={index} 
                className={`${group.isToday ? 'font-semibold text-edinburgh-blue' : ''}`}
              >
                <td className="pr-4 align-top">{group.days}</td>
                <td className="text-right tabular-nums">{group.hours}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

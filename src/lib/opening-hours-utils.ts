import { getDb } from './db';
import { OpeningHour } from './data-utils';

// Interface for formatted opening hours results
export interface FormattedOpeningHourGroup {
  dayText: string;
  hours: string;
}

// Monday-first weekday order (0 = Monday, 6 = Sunday)
export const MONDAY_FIRST_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Format opening hours with consecutive days grouped
export function formatGroupedOpeningHours(hours: OpeningHour[]): FormattedOpeningHourGroup[] {
  // Exit early if no hours
  if (!hours || hours.length === 0) {
    return [];
  }
  
  // Order days starting with Monday
  // SQLite stores 0=Sunday in day_of_week, we reorder to Monday-first
  const reorderedHours = [...hours].sort((a, b) => {
    // Convert Sunday (0) to 6, otherwise subtract 1
    const dayA = a.day_of_week === 0 ? 6 : a.day_of_week - 1;
    const dayB = b.day_of_week === 0 ? 6 : b.day_of_week - 1;
    return dayA - dayB;
  });

  // Group consecutive days with the same hours
  const groups: Array<{
    startDay: number;
    endDay: number;
    hours: string;
    isClosed: boolean;
    isByAppointment: boolean;
  }> = [];
  
  // Process each day
  let currentGroup: {
    startDay: number;
    endDay: number;
    hours: string;
    isClosed: boolean;
    isByAppointment: boolean;
  } | null = null;
  
  // Process days in Monday-first order
  reorderedHours.forEach((day, index) => {
    // Convert SQLite 0-6 (Sun-Sat) to our 0-6 (Mon-Sun) format
    const dayIndex = day.day_of_week === 0 ? 6 : day.day_of_week - 1;
    
    // Format the hours string
    let hoursStr = '';
    
    if (day.is_closed) {
      hoursStr = 'Closed';
    } else if (day.is_by_appointment) {
      hoursStr = 'By appointment only';
    } else if (day.open_time && day.close_time) {
      // Remove leading zeros from hours (but keep minutes)
      const openTime = day.open_time.replace(/^0(\d)/, '$1');
      const closeTime = day.close_time.replace(/^0(\d)/, '$1');
      hoursStr = `${openTime} - ${closeTime}`;
    } else {
      hoursStr = 'Hours not specified';
    }
    
    // Determine if this day should be grouped with the previous
    if (currentGroup && 
        hoursStr === currentGroup.hours && 
        (dayIndex === (currentGroup.endDay + 1) % 7)) {
      // Extend the current group
      currentGroup.endDay = dayIndex;
    } else {
      // If there was a previous group, finalize it
      if (currentGroup) {
        groups.push({ ...currentGroup });
      }
      
      // Start a new group
      currentGroup = {
        startDay: dayIndex,
        endDay: dayIndex,
        hours: hoursStr,
        isClosed: day.is_closed ? true : false,
        isByAppointment: day.is_by_appointment ? true : false
      };
    }
  });
  
  // Add the last group
  if (currentGroup) {
    groups.push(currentGroup);
  }
  
  // Format the groups into readable strings
  return groups.map(group => {
    let dayText = '';
    
    if (group.startDay === group.endDay) {
      // Single day
      dayText = MONDAY_FIRST_DAYS[group.startDay];
    } else if ((group.endDay === group.startDay + 1) || 
               (group.startDay === 6 && group.endDay === 0)) {
      // Two consecutive days - use '&' (e.g., Saturday & Sunday)
      dayText = `${MONDAY_FIRST_DAYS[group.startDay]} & ${MONDAY_FIRST_DAYS[group.endDay]}`;
    } else {
      // Range of days - use 'to' (e.g., Monday to Friday)
      dayText = `${MONDAY_FIRST_DAYS[group.startDay]} to ${MONDAY_FIRST_DAYS[group.endDay]}`;
    }
    
    return {
      dayText,
      hours: group.hours
    };
  });
}

// Functions for managing opening hours
export async function getOpeningHoursByPlaceId(placeId: number): Promise<OpeningHour[]> {
  const db = await getDb();
  return db.all(
    `SELECT * FROM opening_hours WHERE place_id = ? ORDER BY day_of_week ASC`,
    [placeId]
  ) as Promise<OpeningHour[]>;
}

export async function createOpeningHour(openingHour: OpeningHour): Promise<number> {
  const db = await getDb();
  const result = await db.run(
    `INSERT INTO opening_hours 
     (place_id, day_of_week, open_time, close_time, is_closed, is_by_appointment, notes) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      openingHour.place_id,
      openingHour.day_of_week,
      openingHour.open_time,
      openingHour.close_time,
      openingHour.is_closed ? 1 : 0,
      openingHour.is_by_appointment ? 1 : 0,
      openingHour.notes
    ]
  );
  return result.lastID || 0;
}

export async function updateOpeningHour(id: number, openingHour: Partial<OpeningHour>): Promise<void> {
  const db = await getDb();
  const fields: string[] = [];
  const values: any[] = [];

  // Only update fields that are provided
  if (openingHour.open_time !== undefined) {
    fields.push('open_time = ?');
    values.push(openingHour.open_time);
  }
  if (openingHour.close_time !== undefined) {
    fields.push('close_time = ?');
    values.push(openingHour.close_time);
  }
  if (openingHour.is_closed !== undefined) {
    fields.push('is_closed = ?');
    values.push(openingHour.is_closed ? 1 : 0);
  }
  if (openingHour.is_by_appointment !== undefined) {
    fields.push('is_by_appointment = ?');
    values.push(openingHour.is_by_appointment ? 1 : 0);
  }
  if (openingHour.notes !== undefined) {
    fields.push('notes = ?');
    values.push(openingHour.notes);
  }

  if (fields.length === 0) return; // Nothing to update

  values.push(id); // Add id for WHERE clause

  await db.run(
    `UPDATE opening_hours SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
}

export async function deleteOpeningHour(id: number): Promise<void> {
  const db = await getDb();
  await db.run('DELETE FROM opening_hours WHERE id = ?', [id]);
}

export async function deleteAllOpeningHoursForPlace(placeId: number): Promise<void> {
  const db = await getDb();
  await db.run('DELETE FROM opening_hours WHERE place_id = ?', [placeId]);
}

export async function bulkCreateOpeningHours(openingHours: OpeningHour[]): Promise<void> {
  const db = await getDb();
  
  // Use a transaction for better performance and atomicity
  await db.exec('BEGIN TRANSACTION');
  
  try {
    const stmt = await db.prepare(
      `INSERT INTO opening_hours 
       (place_id, day_of_week, open_time, close_time, is_closed, is_by_appointment, notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );

    for (const hour of openingHours) {
      await stmt.run([
        hour.place_id,
        hour.day_of_week,
        hour.open_time,
        hour.close_time,
        hour.is_closed ? 1 : 0,
        hour.is_by_appointment ? 1 : 0,
        hour.notes
      ]);
    }

    await stmt.finalize();
    await db.exec('COMMIT');
  } catch (error) {
    await db.exec('ROLLBACK');
    throw error;
  }
}

// Create a standard set of opening hours (Mon-Sat 9-5, Sun closed)
export async function createDefaultOpeningHours(placeId: number): Promise<void> {
  const defaultHours: OpeningHour[] = [
    // Sunday (closed)
    {
      place_id: placeId,
      day_of_week: 0,
      open_time: null,
      close_time: null,
      is_closed: true,
      is_by_appointment: false,
      notes: 'Closed'
    },
    // Monday-Friday (9am-5pm)
    ...[1, 2, 3, 4, 5].map(day => ({
      place_id: placeId,
      day_of_week: day,
      open_time: '09:00',
      close_time: '17:00',
      is_closed: false,
      is_by_appointment: false,
      notes: null
    })),
    // Saturday (10am-4pm)
    {
      place_id: placeId,
      day_of_week: 6,
      open_time: '10:00',
      close_time: '16:00',
      is_closed: false,
      is_by_appointment: false,
      notes: null
    }
  ];

  await bulkCreateOpeningHours(defaultHours);
}

// Helper function to check if a place requires appointments
export async function isPlaceByAppointment(placeId: number): Promise<boolean> {
  const db = await getDb();
  const dayOfWeek = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.

  // Check if any opening hours for today have the is_by_appointment flag set
  const result = await db.get(
    `SELECT COUNT(*) as count FROM opening_hours 
     WHERE place_id = ? AND day_of_week = ? AND is_by_appointment = 1`,
    [placeId, dayOfWeek]
  );

  return (result?.count || 0) > 0;
}

// Helper function to check if a place is currently open
export async function isPlaceCurrentlyOpen(placeId: number): Promise<boolean> {
  const openingHours = await getOpeningHoursByPlaceId(placeId);
  if (openingHours.length === 0) return false;

  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
  
  console.log(`Checking if place ${placeId} is open. Current time: ${currentTime}, Day: ${dayOfWeek}`);

  // Find the opening hours for today
  const todayHours = openingHours.find(hour => hour.day_of_week === dayOfWeek);
  if (!todayHours || todayHours.is_closed) {
    console.log(`Place ${placeId} has no hours for today or is marked closed`);
    return false;
  }
  if (todayHours.is_by_appointment) {
    console.log(`Place ${placeId} is by appointment only`);
    return false; // By appointment only, not 'open'
  }

  // If we have open and close times, check if current time is within range
  if (todayHours.open_time && todayHours.close_time) {
    console.log(`Place ${placeId} hours today: ${todayHours.open_time} to ${todayHours.close_time}`);
    
    // Convert times to minutes since midnight for easier comparison
    const openTimeParts = todayHours.open_time.split(':');
    const closeTimeParts = todayHours.close_time.split(':');
    const currentTimeParts = currentTime.split(':');
    
    const openMinutes = parseInt(openTimeParts[0]) * 60 + parseInt(openTimeParts[1] || '0');
    const closeMinutes = parseInt(closeTimeParts[0]) * 60 + parseInt(closeTimeParts[1] || '0');
    const currentMinutes = currentHour * 60 + currentMinute;
    
    // If closing time is less than opening time, it's overnight (e.g., 22:00-02:00)
    const isOvernight = closeMinutes < openMinutes;
    
    let isOpen;
    if (isOvernight) {
      // For overnight hours, we're open if current time is after opening OR before closing
      isOpen = currentMinutes >= openMinutes || currentMinutes < closeMinutes;
    } else {
      // For same-day hours, we're open if current time is between opening and closing
      isOpen = currentMinutes >= openMinutes && currentMinutes < closeMinutes;
    }
    
    console.log(`Place ${placeId} open status: ${isOpen} (${isOvernight ? 'overnight hours' : 'same-day hours'})`);
    return isOpen;
  }

  console.log(`Place ${placeId} has no valid open/close times`);
  return false;
}

// Helper to check if a place will close soon (within the next hour)
export async function willPlaceCloseSoon(placeId: number, minutesThreshold: number = 60): Promise<boolean> {
  const openingHours = await getOpeningHoursByPlaceId(placeId);
  if (openingHours.length === 0) return false;

  const now = new Date();
  const dayOfWeek = now.getDay();
  
  // Find today's hours
  const todayHours = openingHours.find(hour => hour.day_of_week === dayOfWeek);
  if (!todayHours || todayHours.is_closed || !todayHours.close_time) return false;
  
  // Parse closing time
  const [closeHour, closeMinute] = todayHours.close_time.split(':').map(Number);
  const closeTimeDate = new Date();
  closeTimeDate.setHours(closeHour, closeMinute, 0, 0);
  
  // Calculate minutes until closing
  const minutesUntilClose = (closeTimeDate.getTime() - now.getTime()) / (1000 * 60);
  
  // Return true if we're currently open and will close within the threshold
  return await isPlaceCurrentlyOpen(placeId) && minutesUntilClose > 0 && minutesUntilClose <= minutesThreshold;
}

// Parse legacy opening_hours string into structured format
export function parseLegacyOpeningHours(openingHoursStr: string | null, placeId: number): OpeningHour[] {
  if (!openingHoursStr) return [];
  
  const dayMapping: Record<string, number> = {
    'sun': 0, 'sunday': 0,
    'mon': 1, 'monday': 1,
    'tue': 2, 'tues': 2, 'tuesday': 2,
    'wed': 3, 'weds': 3, 'wednesday': 3,
    'thu': 4, 'thur': 4, 'thurs': 4, 'thursday': 4,
    'fri': 5, 'friday': 5,
    'sat': 6, 'saturday': 6
  };
  
  const result: OpeningHour[] = [];
  
  // Create default closed hours for all days
  for (let i = 0; i < 7; i++) {
    result.push({
      place_id: placeId,
      day_of_week: i,
      open_time: null,
      close_time: null,
      is_closed: true,
      is_by_appointment: false,
      notes: null
    });
  }
  
  // Try to parse the string into structured hours
  try {
    // Split by comma or semicolon
    const parts = openingHoursStr.split(/[,;]/).map(p => p.trim()).filter(Boolean);
    
    for (const part of parts) {
      // Try to match patterns like "Mon-Fri: 9am-5pm" or "Sat: 10-4" or "Sun: Closed"
      const dayMatch = part.match(/^([a-zA-Z\-]+):(.*)/i);
      
      if (dayMatch) {
        const dayPart = dayMatch[1].toLowerCase().trim();
        const timePart = dayMatch[2].trim();
        
        // Check if it's a day range (e.g. "Mon-Fri")
        const dayRange = dayPart.match(/^([a-zA-Z]+)\s*-\s*([a-zA-Z]+)$/i);
        
        let days: number[] = [];
        
        if (dayRange && dayMapping[dayRange[1]] !== undefined && dayMapping[dayRange[2]] !== undefined) {
          // Handle day range
          const startDay = dayMapping[dayRange[1]];
          const endDay = dayMapping[dayRange[2]];
          
          // Create the range of days
          for (let d = startDay; d <= endDay; d++) {
            days.push(d);
          }
          // If end day is before start day (e.g., "Fri-Sun"), wrap around
          if (endDay < startDay) {
            for (let d = startDay; d < 7; d++) {
              days.push(d);
            }
            for (let d = 0; d <= endDay; d++) {
              days.push(d);
            }
          }
        } else if (dayMapping[dayPart] !== undefined) {
          // Single day
          days = [dayMapping[dayPart]];
        }
        
        // If we identified days, process the times
        if (days.length > 0) {
          if (timePart.toLowerCase().includes('closed')) {
            // Day is marked as closed
            for (const day of days) {
              const hourInfo = result.find(h => h.day_of_week === day);
              if (hourInfo) {
                hourInfo.is_closed = true;
                hourInfo.notes = 'Closed';
              }
            }
          } else if (timePart.toLowerCase().includes('appointment')) {
            // By appointment only
            for (const day of days) {
              const hourInfo = result.find(h => h.day_of_week === day);
              if (hourInfo) {
                hourInfo.is_closed = false;
                hourInfo.is_by_appointment = true;
                hourInfo.notes = 'By appointment only';
              }
            }
          } else {
            // Try to parse times like "9am-5pm" or "10:00-17:00"
            const timeMatch = timePart.match(/(\d+(?::\d+)?(?:am|pm)?)\s*-\s*(\d+(?::\d+)?(?:am|pm)?)/i);
            
            if (timeMatch) {
              const openTimeStr = timeMatch[1];
              const closeTimeStr = timeMatch[2];
              
              // Convert to 24-hour format
              const openTime = convertTo24HourFormat(openTimeStr);
              const closeTime = convertTo24HourFormat(closeTimeStr);
              
              if (openTime && closeTime) {
                for (const day of days) {
                  const hourInfo = result.find(h => h.day_of_week === day);
                  if (hourInfo) {
                    hourInfo.open_time = openTime;
                    hourInfo.close_time = closeTime;
                    hourInfo.is_closed = false;
                    hourInfo.is_by_appointment = false;
                  }
                }
              }
            }
          }
        }
      }
    }
    
    return result;
  } catch (error) {
    console.error('Error parsing opening hours:', error);
    return result;
  }
}

// Helper function to convert time strings to 24-hour format
function convertTo24HourFormat(timeStr: string): string | null {
  try {
    // Already in 24 hour format with colon "14:30"
    if (timeStr.includes(':')) {
      const [hours, minutes] = timeStr.split(':').map(part => parseInt(part, 10));
      if (!isNaN(hours) && !isNaN(minutes) && hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      }
    }
    
    // Check for am/pm designation
    const isPM = timeStr.toLowerCase().includes('pm');
    const isAM = timeStr.toLowerCase().includes('am');
    
    // Remove am/pm suffix
    const cleanTime = timeStr.toLowerCase().replace(/(am|pm)/i, '').trim();
    
    // Parse hours and minutes
    let hours, minutes;
    
    if (cleanTime.includes(':')) {
      [hours, minutes] = cleanTime.split(':').map(Number);
    } else {
      hours = parseInt(cleanTime, 10);
      minutes = 0;
    }
    
    // Adjust hours for pm
    if (isPM && hours < 12) {
      hours += 12;
    }
    
    // Handle 12am as 00:00
    if (isAM && hours === 12) {
      hours = 0;
    }
    
    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours >= 24 || minutes < 0 || minutes >= 60) {
      return null;
    }
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  } catch (error) {
    return null;
  }
}

// Clean up any formatting issues in opening hours text
function cleanOpeningHoursText(text: string): string {
  if (!text) return '';
  
  // Strip all numeric prefixes from specific texts
  if (text.includes('By appointment')) {
    return 'By appointment only';
  }
  
  if (text.includes('Closed')) {
    return 'Closed';
  }
  
  // Fix time ranges by ensuring there are no leading zeros
  if (text.includes('-')) {
    const parts = text.split('-');
    // Process each part to ensure proper formatting
    const cleanedParts = parts.map(part => {
      // Extract AM/PM
      const hasAM = part.includes('AM');
      const hasPM = part.includes('PM');
      
      // Remove all non-essential characters
      let cleanPart = part.replace(/[^0-9:]/g, '');
      
      // Split into hours and minutes if there's a colon
      if (cleanPart.includes(':')) {
        const [hours, minutes] = cleanPart.split(':').map(Number);
        // Format without leading zeros for hours
        return `${hours}:${minutes.toString().padStart(2, '0')}${hasAM ? 'AM' : hasPM ? 'PM' : ''}`;
      } else {
        // Just a plain number
        const hours = parseInt(cleanPart, 10);
        return `${hours}${hasAM ? 'AM' : hasPM ? 'PM' : ''}`;
      }
    });
    
    return cleanedParts.join('-');
  }
  
  return text;
}

// Generate a human-readable text from structured opening hours
export function formatOpeningHoursToString(hours: OpeningHour[]): string {
  if (!hours || hours.length === 0) return 'Hours not available';
  
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  let formatted = '';
  
  // Sort by day of week
  const sortedHours = [...hours].sort((a, b) => a.day_of_week - b.day_of_week);
  
  // Group consecutive days with the same hours
  let currentGroup: OpeningHour[] = [];
  
  for (let i = 0; i < sortedHours.length; i++) {
    const current = sortedHours[i];
    
    if (currentGroup.length === 0) {
      currentGroup.push(current);
      continue;
    }
    
    const last = currentGroup[currentGroup.length - 1];
    
    // Check if hours are the same as the last one in the group
    const sameHours = 
      current.is_closed === last.is_closed &&
      current.is_by_appointment === last.is_by_appointment &&
      current.open_time === last.open_time &&
      current.close_time === last.close_time;
    
    // Check if days are consecutive
    const isConsecutive = (current.day_of_week === (last.day_of_week + 1) % 7);
    
    if (sameHours && isConsecutive) {
      currentGroup.push(current);
    } else {
      // Process the current group
      formatted += formatHoursGroup(currentGroup, daysOfWeek);
      currentGroup = [current];
    }
  }
  
  // Process the last group
  if (currentGroup.length > 0) {
    formatted += formatHoursGroup(currentGroup, daysOfWeek);
  }
  
  // Clean the final text to remove any remaining formatting issues
  return cleanOpeningHoursText(formatted.trim());
}

// Format a group of hours for display
function formatHoursGroup(group: OpeningHour[], daysOfWeek: string[]): string {
  if (group.length === 0) return '';
  
  const first = group[0];
  let dayText = '';
  
  if (group.length === 1) {
    // Single day
    dayText = daysOfWeek[first.day_of_week];
  } else if (group.length === 7) {
    // All days are the same
    dayText = 'Every day';
  } else {
    // Day range
    dayText = `${daysOfWeek[group[0].day_of_week]}-${daysOfWeek[group[group.length - 1].day_of_week]}`;
  }
  
  // Determine time text based on conditions
  let timeText;
  
  if (first.is_closed) {
    timeText = 'Closed';
  } else if (first.is_by_appointment) {
    // Special case for appointment-only
    timeText = 'By appointment only';
  } else if (first.open_time && first.close_time) {
    // Format standard opening/closing times
    const openTime = formatTimeFor12Hour(first.open_time);
    const closeTime = formatTimeFor12Hour(first.close_time);
    timeText = `${openTime}-${closeTime}`;
  } else {
    timeText = 'Hours not specified';
  }
  
  // Clean any potential issues in the text before returning
  // Force a clean, properly formatted string
  const cleanText = cleanOpeningHoursText(timeText);
  return `${dayText}: ${cleanText}\n`;
}

// Simplified and more robust 12-hour time formatter
export function formatTimeFor12Hour(time24: string): string {
  try {
    // Handle invalid inputs
    if (!time24 || !time24.includes(':')) {
      return time24 || '';
    }
    
    // Parse hours and minutes
    let [hoursStr, minutesStr] = time24.split(':');
    let hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);
    
    // Handle parsing errors
    if (isNaN(hours) || isNaN(minutes)) {
      return time24;
    }
    
    // Convert to 12-hour format
    const period = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours === 0 ? 12 : hours; // 0 hours should be 12 in 12-hour format
    
    // Format the time string with or without minutes
    const minutesPart = minutes > 0 ? `:${minutes.toString().padStart(2, '0')}` : '';
    return `${hours}${minutesPart}${period}`;
  } catch (error) {
    console.error('Error formatting time:', error, time24);
    return time24 || '';
  }
}

/**
 * Client-side formatting utilities for the Edinburgh Antiques Trail application
 * These functions are used to format data for display in the browser
 */

/**
 * Format time from 24-hour to 12-hour format, removing leading zeros
 * @param {string} time24 - Time in 24-hour format (e.g. "09:30" or "14:00")
 * @returns {string} Time in 12-hour format (e.g. "9:30AM" or "2PM")
 */
export function formatTime(time24) {
  if (!time24 || typeof time24 !== 'string') {
    return '';
  }
  
  // Handle special text cases first - these take precedence
  if (time24.toLowerCase().includes('appointment')) {
    return 'By appointment only';
  }
  
  if (time24.toLowerCase().includes('closed')) {
    return 'Closed';
  }
  
  // Remove any digit prefix - we don't want any leading digits that shouldn't be there
  // This handles cases like "0By appointment" -> "By appointment"
  time24 = time24.replace(/^\d+(?=[A-Za-z])/, '');
  
  // Very aggressive zero removal - if it starts with 0 followed by a digit, remove the 0
  time24 = time24.replace(/^0(\d)/, '$1');
  
  // Handle normal time formats with colons
  if (time24.includes(':')) {
    // Split on the colon
    const parts = time24.split(':');
    let hoursStr = parts[0];
    
    // Always parse hours as integer to remove leading zeros
    let hours = parseInt(hoursStr, 10);
    if (isNaN(hours)) return time24; // If not a valid number, return original
    
    let minutesPart = parts[1] || '00';
    
    // Check for AM/PM in the minutes part
    let period = '';
    if (minutesPart.toUpperCase().includes('AM')) {
      period = 'AM';
      minutesPart = minutesPart.replace(/AM/i, '');
    } else if (minutesPart.toUpperCase().includes('PM')) {
      period = 'PM';
      minutesPart = minutesPart.replace(/PM/i, '');
    } else {
      // No explicit AM/PM, determine based on hours
      period = hours >= 12 ? 'PM' : 'AM';
    }
    
    // Convert to 12-hour format if needed
    if (hours > 12) {
      hours = hours - 12;
    } else if (hours === 0) {
      hours = 12; // 0:00 should be 12AM
    }
    
    // Parse minutes as integer and format
    const minutes = parseInt(minutesPart, 10);
    
    // Format with or without minutes
    if (isNaN(minutes) || minutes === 0) {
      return `${hours}${period}`;
    } else {
      return `${hours}:${minutes.toString().padStart(2, '0')}${period}`;
    }
  }
  
  // Try to extract a number from the beginning of the string
  const hourMatch = time24.match(/^(\d+)/);
  if (hourMatch) {
    const hours = parseInt(hourMatch[1], 10);
    // Determine AM/PM based on hours value
    const period = (hours >= 12) ? 'PM' : 'AM';
    // Convert to 12-hour format
    const hours12 = hours % 12 || 12;
    return `${hours12}${period}`;
  }
  
  // Just return the original if we can't parse it
  return time24;
}

/**
 * Clean up opening hours text to ensure it's properly formatted
 * @param {string} text - The opening hours text to clean
 * @returns {string} Cleaned opening hours text
 */
export function cleanOpeningHoursText(text) {
  if (!text) {
    return '';
  }
  
  // Fix common formatting issues
  return text
    // Remove leading zeros from times
    .replace(/\b0(\d)/g, '$1')
    // Convert dash format to "to" format for time ranges
    .replace(/(\d+)(:(\d+))?\s*-\s*(\d+)(:(\d+))?/g, '$1$2 to $4$5')
    // Fix any remaining formatting issues with dashes
    .replace(/\s*-\s*/g, ' - ')
    // Fix "By appointment" cases with leading zeros
    .replace(/\b0+By appointment/gi, 'By appointment');
  // All replacements are handled in the chain above
  
  // For other cases, just try to format it
  return formatTime(text);
}

/**
 * Format a complete day's opening hours
 * @param {string} day - Day of week (e.g. "Monday")
 * @param {string} hours - Hours string (e.g. "09:00-17:00")
 * @returns {string} Formatted day and hours (e.g. "Monday: 9AM-5PM")
 */
export function formatDayHours(day, hours) {
  return `${day}: ${cleanOpeningHoursText(hours)}`;
}

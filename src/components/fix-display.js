/**
 * Fix for opening hours display across the application
 * This helper ensures consistent display without leading zeros
 */

/**
 * Aggressively removes leading zeros from time strings and formats them properly
 * @param {string} timeStr - Time string to clean
 * @returns {string} - Cleaned time string
 */
export function cleanTimeDisplay(timeStr) {
  if (!timeStr) return '';
  
  // Handle special text cases
  if (typeof timeStr === 'string') {
    if (timeStr.toLowerCase().includes('appointment')) {
      return 'By appointment only';
    }
    
    if (timeStr.toLowerCase().includes('closed')) {
      return 'Closed';
    }
    
    // Super aggressive cleaning of any prefix leading zeros before text
    timeStr = timeStr.replace(/^0+/, '');
    
    // Handle times with colons - convert to 12-hour format
    if (timeStr.includes(':')) {
      // Split on colon
      const parts = timeStr.split(':');
      const hours = parseInt(parts[0], 10) || 0;
      const minutes = parseInt(parts[1], 10) || 0;
      
      // Determine AM/PM
      const period = hours >= 12 ? 'PM' : 'AM';
      const hours12 = hours % 12 || 12; // Convert 0 to 12
      
      // Format with or without minutes
      if (minutes === 0) {
        return `${hours12}${period}`;
      } else {
        return `${hours12}:${minutes.toString().padStart(2, '0')}${period}`;
      }
    }
    
    // For time ranges like "9:00-5:00"
    if (timeStr.includes('-')) {
      const times = timeStr.split('-');
      return times.map(t => cleanTimeDisplay(t.trim())).join('-');
    }
  }
  
  return timeStr;
}

/**
 * Process opening hours data to remove leading zeros
 * This works on both structured data and plain strings
 * @param {any} data - Opening hours data (string or object)
 * @returns {any} - Processed data
 */
export function processOpeningHours(data) {
  if (!data) return data;
  
  // If it's just a string, clean it directly
  if (typeof data === 'string') {
    return cleanTimeDisplay(data);
  }
  
  // If it's an array of opening hours objects
  if (Array.isArray(data)) {
    return data.map(hour => {
      if (hour.open_time) {
        hour.open_time = cleanTimeDisplay(hour.open_time);
      }
      if (hour.close_time) {
        hour.close_time = cleanTimeDisplay(hour.close_time);
      }
      return hour;
    });
  }
  
  // Return original if we can't process it
  return data;
}

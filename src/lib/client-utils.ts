// client-utils.ts - Contains only browser-safe utility functions with no Node.js dependencies

// Simplified and more robust 12-hour time formatter - safe for client-side use
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

// Clean up any formatting issues in opening hours text - client-safe version
export function cleanOpeningHoursText(text: string): string {
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

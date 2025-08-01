// Common validation patterns for shop data management

// UK phone number pattern (flexible format)
// Added support for Edinburgh format 0131 123 1234 with spaces and mobile numbers with spaces
export const UK_PHONE_REGEX = /^(?:(?:\+44\s?|0)(?:1(?:\d{9}|\d{3}\s\d{3}\s\d{4}|\d{3}[ -]?\d{3}[ -]?\d{4})|[23]\d{9}|7(?:[1345789](?:\d{8}|\d{4}[ -]?\d{4}|\d{3}[ -]?\d{3}[ -]?\d{2})|624\d{6})))$/;

// Email pattern
export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Website URL pattern - very permissive to allow simple domain names
// This regex accepts both full URLs and simple domain names like 'example.com'
export const WEBSITE_REGEX = /^(https?:\/\/)?(www\.)?([a-zA-Z0-9][-a-zA-Z0-9]*\.)+[a-zA-Z0-9]{2,}(\/[-a-zA-Z0-9()@:%_\+.~#?&//=]*)?$/;

// Valid UK postcode
export const UK_POSTCODE_REGEX = /^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$/i;

// Time format (HH:MM)
export const TIME_FORMAT_REGEX = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

// Edinburgh coordinates validation (rough boundary box for Edinburgh area)
export const EDINBURGH_LAT_MIN = 55.8;
export const EDINBURGH_LAT_MAX = 56.0;
export const EDINBURGH_LNG_MIN = -3.4;
export const EDINBURGH_LNG_MAX = -3.0;

// Validation functions

/**
 * Validates if a string is a valid UK phone number
 */
export function isValidUKPhone(phone: string): boolean {
  if (!phone) return true; // Optional field
  return UK_PHONE_REGEX.test(phone.trim());
}

/**
 * Validates if a string is a valid email address
 */
export function isValidEmail(email: string): boolean {
  if (!email) return true; // Optional field
  return EMAIL_REGEX.test(email.trim());
}

// UK Postcode formatter - adds a space between outward and inward parts
export function formatUKPostcode(postcode: string): string {
  if (!postcode) return '';
  
  // Remove all existing spaces
  const cleanPostcode = postcode.replace(/\s/g, '').toUpperCase();
  
  // If less than 5 characters, can't properly format yet
  if (cleanPostcode.length < 5) return cleanPostcode;
  
  // UK postcodes have the inward code as the last 3 characters
  // and the outward code as everything before that
  const inwardCode = cleanPostcode.slice(-3);
  const outwardCode = cleanPostcode.slice(0, -3);
  
  return `${outwardCode} ${inwardCode}`;
}

/**
 * Validates if a string is a valid website URL (with or without http/https)
 */
export function isValidWebsite(website: string): boolean {
  if (!website) return true; // Optional field
  website = website.trim();
  // If there's a space, it's not a valid URL
  if (/\s/.test(website)) return false;
  
  // Very simple domain-only validation (e.g., "example.com")
  if (/^[a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,}$/.test(website)) {
    return true;
  }
  
  // Check using our less restrictive regex for more complex URLs
  return WEBSITE_REGEX.test(website);
}

/**
 * Validates if coordinates are within Edinburgh area
 */
export function isInEdinburghArea(lat: number, lng: number): boolean {
  return (
    lat >= EDINBURGH_LAT_MIN &&
    lat <= EDINBURGH_LAT_MAX &&
    lng >= EDINBURGH_LNG_MIN &&
    lng <= EDINBURGH_LNG_MAX
  );
}

/**
 * Validates if a string is a valid time format (HH:MM)
 */
export function isValidTimeFormat(time: string): boolean {
  if (!time) return true; // Optional field
  return TIME_FORMAT_REGEX.test(time.trim());
}

/**
 * Formats a phone number to a standard format
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone) return '';
  
  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '');
  
  // Format based on length and pattern
  if (digitsOnly.startsWith('44') && digitsOnly.length >= 12) {
    // International format: +44 XXXX XXXXXX
    return `+${digitsOnly.slice(0, 2)} ${digitsOnly.slice(2, 6)} ${digitsOnly.slice(6)}`;
  } else if (digitsOnly.startsWith('0131') && digitsOnly.length >= 10) {
    // Edinburgh format: 0131 123 1234
    return `0131 ${digitsOnly.slice(4, 7)} ${digitsOnly.slice(7, 11)}`;
  } else if (digitsOnly.startsWith('07') && digitsOnly.length === 11) {
    // UK mobile: 07123 456789
    return `${digitsOnly.slice(0, 5)} ${digitsOnly.slice(5)}`;
  } else if (digitsOnly.length === 11 && digitsOnly.startsWith('0')) {
    // Other UK format: 01234 567890
    return `${digitsOnly.slice(0, 5)} ${digitsOnly.slice(5)}`;
  } else if (digitsOnly.length > 0) {
    // For incomplete numbers, just strip extra spaces but keep input as is
    return phone.replace(/\s+/g, ' ').trim();
  }
  
  // If doesn't match known patterns, return cleaned up version
  return digitsOnly;
}

/**
 * Formats a website URL - but doesn't force http/https
 */
export function formatWebsiteUrl(url: string): string {
  if (!url) return '';
  // Just trim whitespace but don't force protocol or www
  return url.trim();
}

/**
 * Validates opening hours format
 */
export function validateOpeningHours(openingHours: string): { isValid: boolean; message?: string } {
  if (!openingHours) return { isValid: true };
  
  // Basic format check - this could be expanded for more complex validation
  const lines = openingHours.split(/\n|,/).map(line => line.trim()).filter(Boolean);
  
  for (const line of lines) {
    // Check for day-hour format pattern (e.g., "Monday: 9:00-17:00")
    const match = line.match(/^([a-zA-Z-]+):\s*([0-9:]+)\s*-\s*([0-9:]+)$/);
    if (!match) {
      return { 
        isValid: false, 
        message: `Invalid format on line "${line}". Use format "Day: HH:MM-HH:MM"` 
      };
    }
    
    const [_, day, openTime, closeTime] = match;
    
    // Validate times
    if (!isValidTimeFormat(openTime) || !isValidTimeFormat(closeTime)) {
      return { 
        isValid: false, 
        message: `Invalid time format on line "${line}". Use 24-hour format (HH:MM)` 
      };
    }
    
    // Check if closing time is after opening time
    const [openHour, openMinute] = openTime.split(':').map(Number);
    const [closeHour, closeMinute] = closeTime.split(':').map(Number);
    
    if (closeHour < openHour || (closeHour === openHour && closeMinute <= openMinute)) {
      return { 
        isValid: false, 
        message: `Closing time must be after opening time on line "${line}"` 
      };
    }
  }
  
  return { isValid: true };
}

/**
 * Helper function to generate error messages for required fields
 */
export function getRequiredFieldMessage(fieldName: string): string {
  return `${fieldName} is required`;
}

/**
 * Helper function to sanitize user input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';
  
  // Replace potentially dangerous characters
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

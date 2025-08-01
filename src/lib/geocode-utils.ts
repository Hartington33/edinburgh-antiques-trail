/**
 * Utilities for geocoding UK postcodes
 */

const POSTCODES_API_URL = 'https://api.postcodes.io/postcodes';

/**
 * Result interface for Postcodes.io API
 */
interface PostcodeResponse {
  status: number;
  result: {
    postcode: string;
    quality: number;
    eastings: number;
    northings: number;
    country: string;
    nhs_ha: string;
    longitude: number;
    latitude: number;
    european_electoral_region: string;
    primary_care_trust: string;
    region: string;
    lsoa: string;
    msoa: string;
    incode: string;
    outcode: string;
    parliamentary_constituency: string;
    admin_district: string;
    parish: string;
    admin_county: string | null;
    admin_ward: string;
    ced: string | null;
    ccg: string;
    nuts: string;
    codes: {
      admin_district: string;
      admin_county: string;
      admin_ward: string;
      parish: string;
      parliamentary_constituency: string;
      ccg: string;
      ccg_id: string;
      ced: string;
      nuts: string;
      lsoa: string;
      msoa: string;
      lau2: string;
    };
  };
}

/**
 * Batch Postcode Result interface
 */
interface BatchPostcodeResponse {
  status: number;
  result: {
    query: string;
    result: PostcodeResponse['result'] | null;
  }[];
}

/**
 * Coordinate interface
 */
export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Get the latitude and longitude for a single UK postcode
 * @param postcode UK postcode
 * @returns Promise resolving to coordinates or null if not found
 */
export async function getCoordinatesFromPostcode(postcode: string): Promise<Coordinates | null> {
  try {
    // Clean the postcode by removing spaces and converting to uppercase
    const cleanPostcode = postcode.replace(/\s+/g, '').toUpperCase();
    
    // Make API request
    const response = await fetch(`${POSTCODES_API_URL}/${encodeURIComponent(cleanPostcode)}`);
    
    if (!response.ok) {
      console.error(`Error fetching coordinates for postcode ${postcode}: ${response.statusText}`);
      return null;
    }
    
    const data = await response.json() as PostcodeResponse;
    
    if (data.status !== 200 || !data.result) {
      console.error(`No results found for postcode ${postcode}`);
      return null;
    }
    
    return {
      latitude: data.result.latitude,
      longitude: data.result.longitude
    };
  } catch (error) {
    console.error(`Error in getCoordinatesFromPostcode for ${postcode}:`, error);
    return null;
  }
}

/**
 * Get coordinates for multiple postcodes at once (batch processing)
 * @param postcodes Array of UK postcodes
 * @returns Promise resolving to a map of postcodes to coordinates
 */
export async function batchGetCoordinatesFromPostcodes(postcodes: string[]): Promise<Map<string, Coordinates | null>> {
  try {
    // Clean the postcodes
    const cleanPostcodes = postcodes.map(p => p.replace(/\s+/g, '').toUpperCase());
    
    // Make batch API request
    const response = await fetch(`${POSTCODES_API_URL}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        postcodes: cleanPostcodes
      })
    });
    
    if (!response.ok) {
      console.error(`Error fetching batch coordinates: ${response.statusText}`);
      // Return map with all null values
      return new Map(postcodes.map(p => [p, null]));
    }
    
    const data = await response.json() as BatchPostcodeResponse;
    
    if (data.status !== 200) {
      console.error('Batch postcode lookup failed');
      return new Map(postcodes.map(p => [p, null]));
    }
    
    // Create a map of original postcodes to coordinates
    const result = new Map<string, Coordinates | null>();
    
    data.result.forEach((item, index) => {
      if (item.result) {
        result.set(postcodes[index], {
          latitude: item.result.latitude,
          longitude: item.result.longitude
        });
      } else {
        result.set(postcodes[index], null);
      }
    });
    
    return result;
  } catch (error) {
    console.error('Error in batchGetCoordinatesFromPostcodes:', error);
    // Return map with all null values on error
    return new Map(postcodes.map(p => [p, null]));
  }
}

/**
 * Validates if a string is a valid UK postcode format
 * @param postcode String to validate
 * @returns boolean indicating if the format is valid
 */
export function isValidUKPostcode(postcode: string): boolean {
  // UK postcode regex pattern
  const pattern = /^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$/i;
  return pattern.test(postcode);
}

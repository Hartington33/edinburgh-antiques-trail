const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');
// Use node-fetch v2 for compatibility
const fetch = require('node-fetch');

// Paths
const inputFile = path.join(__dirname, '..', 'data', 'processed-shops.csv');
const outputFile = path.join(__dirname, '..', 'data', 'geocoded-shops.csv');

// Postcodes.io API
const POSTCODES_API_URL = 'https://api.postcodes.io/postcodes';

/**
 * Get coordinates for a UK postcode
 */
async function getCoordinatesFromPostcode(postcode) {
  try {
    // Clean the postcode
    const cleanPostcode = postcode.replace(/\\s+/g, '').toUpperCase();
    
    // Skip if empty
    if (!cleanPostcode) {
      return null;
    }
    
    console.log(`Geocoding postcode: ${cleanPostcode}`);
    
    // Make API request
    const response = await fetch(`${POSTCODES_API_URL}/${encodeURIComponent(cleanPostcode)}`);
    
    if (!response.ok) {
      console.error(`Error fetching coordinates for postcode ${postcode}: ${response.statusText}`);
      return null;
    }
    
    const data = await response.json();
    
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
 * Process the CSV file and geocode postcodes
 */
async function processGeocoding() {
  try {
    console.log(`Reading CSV from ${inputFile}...`);
    const csvContent = fs.readFileSync(inputFile, 'utf8');
    
    // Parse CSV
    const parsedCsv = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true
    });
    
    if (parsedCsv.errors.length > 0) {
      console.error('Errors parsing CSV:', parsedCsv.errors);
      process.exit(1);
    }
    
    const rows = parsedCsv.data;
    console.log(`Found ${rows.length} rows to process`);
    
    // Process each row sequentially (to avoid rate limiting)
    const geocodedRows = [];
    for (const row of rows) {
      let coords = null;
      
      if (row.postcode && row.postcode.trim()) {
        coords = await getCoordinatesFromPostcode(row.postcode);
        
        // Add a small delay to avoid hitting rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      geocodedRows.push({
        ...row,
        lat: coords ? coords.latitude : '',
        lng: coords ? coords.longitude : ''
      });
    }
    
    // Generate new CSV
    const newCsv = Papa.unparse(geocodedRows);
    
    // Write to output file
    fs.writeFileSync(outputFile, newCsv);
    console.log(`Geocoded CSV written to ${outputFile}`);
    
    // Print summary
    const successCount = geocodedRows.filter(row => row.lat && row.lng).length;
    console.log(`\nGeocoding results:
- Total rows: ${rows.length}
- Successfully geocoded: ${successCount}
- Failed to geocode: ${rows.length - successCount}
`);
    
  } catch (error) {
    console.error('Error geocoding CSV:', error);
    process.exit(1);
  }
}

// Run the script
processGeocoding();

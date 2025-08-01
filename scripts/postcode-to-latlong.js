/**
 * Script to convert UK postcodes to latitude/longitude
 * This can be used to process CSV files with postcodes before import
 */

const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

// Simple fetch polyfill for Node.js
const fetch = require('node-fetch');

const POSTCODES_API_URL = 'https://api.postcodes.io/postcodes';

/**
 * Get the latitude and longitude for a single UK postcode
 */
async function getCoordinatesFromPostcode(postcode) {
  try {
    // Clean the postcode by removing spaces and converting to uppercase
    const cleanPostcode = postcode.replace(/\\s+/g, '').toUpperCase();
    
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
 * Get coordinates for multiple postcodes at once (batch processing)
 */
async function batchGetCoordinatesFromPostcodes(postcodes) {
  try {
    // Clean the postcodes
    const cleanPostcodes = postcodes.map(p => p.replace(/\\s+/g, '').toUpperCase());
    
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
      return postcodes.map(() => null);
    }
    
    const data = await response.json();
    
    if (data.status !== 200) {
      console.error('Batch postcode lookup failed');
      return postcodes.map(() => null);
    }
    
    // Return array of results in same order as input postcodes
    return data.result.map(item => {
      if (item.result) {
        return {
          latitude: item.result.latitude,
          longitude: item.result.longitude
        };
      }
      return null;
    });
  } catch (error) {
    console.error('Error in batchGetCoordinatesFromPostcodes:', error);
    return postcodes.map(() => null);
  }
}

/**
 * Process a CSV file, adding lat/lng columns based on postcodes
 */
async function processCsvFile(inputFilePath, outputFilePath, postcodeColumn) {
  console.log(`Processing ${inputFilePath}...`);
  
  try {
    // Read the CSV file
    const fileContent = fs.readFileSync(inputFilePath, 'utf-8');
    
    // Parse the CSV
    const csvData = Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true
    });
    
    if (!csvData.data || csvData.data.length === 0) {
      console.error('No data found in CSV file');
      return;
    }
    
    // Check if the postcode column exists
    if (!csvData.data[0].hasOwnProperty(postcodeColumn)) {
      console.error(`Column "${postcodeColumn}" not found in CSV. Available columns: ${Object.keys(csvData.data[0]).join(', ')}`);
      return;
    }
    
    // Extract all postcodes
    const postcodes = csvData.data.map(row => row[postcodeColumn]);
    console.log(`Found ${postcodes.length} postcodes to process...`);
    
    // Process in batches of 100 (API limit)
    const BATCH_SIZE = 100;
    const results = [];
    
    for (let i = 0; i < postcodes.length; i += BATCH_SIZE) {
      const batchPostcodes = postcodes.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${i/BATCH_SIZE + 1}/${Math.ceil(postcodes.length/BATCH_SIZE)}...`);
      
      const batchResults = await batchGetCoordinatesFromPostcodes(batchPostcodes);
      results.push(...batchResults);
      
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Add latitude and longitude to the CSV data
    csvData.data.forEach((row, index) => {
      if (results[index]) {
        row.lat = results[index].latitude;
        row.lng = results[index].longitude;
      } else {
        row.lat = '';
        row.lng = '';
      }
    });
    
    // Convert back to CSV
    const outputCsv = Papa.unparse(csvData.data);
    
    // Write to the output file
    fs.writeFileSync(outputFilePath, outputCsv);
    
    console.log(`Processing complete. Output written to ${outputFilePath}`);
    console.log(`${results.filter(r => r !== null).length} of ${postcodes.length} postcodes were successfully geocoded.`);
    
  } catch (error) {
    console.error('Error processing CSV file:', error);
  }
}

// Check if running from command line
if (require.main === module) {
  // Check command line arguments
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('Usage: node postcode-to-latlong.js <input-csv> <postcode-column-name> [output-csv]');
    console.log('Example: node postcode-to-latlong.js outlets.csv postcode outlets-with-coords.csv');
    process.exit(1);
  }
  
  const inputFilePath = args[0];
  const postcodeColumnName = args[1];
  const outputFilePath = args[2] || `${path.basename(inputFilePath, '.csv')}-with-coords.csv`;
  
  // Run the process
  processCsvFile(inputFilePath, outputFilePath, postcodeColumnName)
    .catch(error => {
      console.error('Error:', error);
      process.exit(1);
    });
}

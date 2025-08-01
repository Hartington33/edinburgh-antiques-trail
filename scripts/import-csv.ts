import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { initDb } from '../src/lib/schema';
import { createPlace, createPlaceType } from '../src/lib/data-utils';
import { createOpeningHour, bulkCreateOpeningHours } from '../src/lib/opening-hours-utils';
import { createOnlineSalesLink, bulkCreateOnlineSalesLinks } from '../src/lib/online-sales-utils';
import { getCoordinatesFromPostcode, batchGetCoordinatesFromPostcodes } from '../src/lib/geocode-utils';

// The expected CSV format is:
// name,address,postcode,phone,email,website,description,specialties,type_name,price_range
// Additional optional columns:
// lat,lng (if not provided, will be determined from postcode)
// opening_hours_mon,opening_hours_tue,opening_hours_wed,opening_hours_thu,opening_hours_fri,opening_hours_sat,opening_hours_sun
// online_sales_platform1,online_sales_url1,online_sales_desc1,online_sales_platform2,online_sales_url2,online_sales_desc2,...

interface PlaceRecord {
  name: string;
  address: string;
  postcode: string;
  phone?: string;
  email?: string;
  website?: string;
  description?: string;
  specialties?: string;
  lat?: number;
  lng?: number;
  type_name: string;
  price_range?: string;
  [key: string]: any; // For dynamic opening hours and online sales fields
}

async function importCsv(filePath: string) {
  console.log(`Importing data from ${filePath}...`);
  
  // Initialize the database
  await initDb();
  
  // Read and parse the CSV file
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const parsedData = Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true, // Automatically convert strings to numbers where appropriate
  });
  
  if (parsedData.errors.length > 0) {
    console.error('Errors parsing CSV:', parsedData.errors);
    return;
  }
  
  // Collect postcodes for any records that need lat/lng lookup
  const recordsNeedingGeocode = (parsedData.data as PlaceRecord[]).filter(
    record => record.postcode && (!record.lat || !record.lng)
  );
  
  if (recordsNeedingGeocode.length > 0) {
    console.log(`Found ${recordsNeedingGeocode.length} records needing geocoding from postcodes...`);
    
    // Process in batches of 100 (API limit)
    const BATCH_SIZE = 100;
    for (let i = 0; i < recordsNeedingGeocode.length; i += BATCH_SIZE) {
      const batchRecords = recordsNeedingGeocode.slice(i, i + BATCH_SIZE);
      const postcodes = batchRecords.map(record => record.postcode);
      
      console.log(`Geocoding batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(recordsNeedingGeocode.length/BATCH_SIZE)}...`);
      const coordinatesMap = await batchGetCoordinatesFromPostcodes(postcodes);
      
      // Update records with coordinates
      batchRecords.forEach(record => {
        const coords = coordinatesMap.get(record.postcode);
        if (coords) {
          record.lat = coords.latitude;
          record.lng = coords.longitude;
          console.log(`Geocoded ${record.name}: ${record.postcode} -> (${record.lat}, ${record.lng})`);
        } else {
          console.warn(`Could not geocode postcode for ${record.name}: ${record.postcode}`);
        }
      });
      
      // Add a small delay to avoid rate limiting
      if (i + BATCH_SIZE < recordsNeedingGeocode.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
  
  // Create a map to track place types we've already added
  const placeTypes = new Map<string, number>();
  
  // Counter for imports
  let importedCount = 0;
  
  // Process each row in the CSV
  for (const record of parsedData.data as PlaceRecord[]) {
    try {
      // Ensure required fields exist
      if (!record.name || !record.address || !record.type_name) {
        console.warn(`Skipping incomplete record: ${record.name || 'Unnamed'}`);
        continue;
      }
      
      // Skip records that couldn't be geocoded if they don't have lat/lng
      if (!record.lat || !record.lng) {
        console.warn(`Skipping record with missing coordinates: ${record.name}`);
        continue;
      }
      
      // Neighborhoods have been removed from the application
      
      // Create place type if it doesn't exist
      let placeTypeId = placeTypes.get(record.type_name);
      if (!placeTypeId) {
        const placeType = await createPlaceType({
          name: record.type_name,
        });
        placeTypeId = placeType.id;
        placeTypes.set(record.type_name, placeTypeId);
        console.log(`Created place type: ${record.type_name}`);
      }
      
      // Create the place
      const place = await createPlace({
        name: record.name,
        address: record.address,
        phone: record.phone || null,
        email: record.email || null,
        website: record.website || null,
        description: record.description || null,
        specialties: record.specialties || null,
        lat: record.lat,
        lng: record.lng,
        price_range: record.price_range || null,
        type_id: placeTypeId,
      });
      
      console.log(`Created place: ${record.name}`);
      
      // Process opening hours if they exist in the CSV
      const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
      const openingHours = [];
      
      for (let i = 0; i < days.length; i++) {
        const day = days[i];
        const fieldName = `opening_hours_${day}`;
        
        if (record[fieldName]) {
          const hourString = record[fieldName].toString().trim().toLowerCase();
          
          if (hourString === 'closed') {
            openingHours.push({
              place_id: place.id,
              day_of_week: i === 6 ? 0 : i + 1, // Sunday is 0 in our DB, Monday is 1, etc.
              is_closed: true,
              is_by_appointment: false,
            });
          } else if (hourString === 'by appointment' || hourString === 'appointment only') {
            openingHours.push({
              place_id: place.id,
              day_of_week: i === 6 ? 0 : i + 1,
              is_closed: false,
              is_by_appointment: true,
            });
          } else {
            // Expected format: "09:00-17:30" or similar
            const times = hourString.split('-');
            if (times.length === 2) {
              openingHours.push({
                place_id: place.id,
                day_of_week: i === 6 ? 0 : i + 1,
                open_time: times[0].trim(),
                close_time: times[1].trim(),
                is_closed: false,
                is_by_appointment: false,
              });
            }
          }
        }
      }
      
      if (openingHours.length > 0) {
        await bulkCreateOpeningHours(openingHours);
        console.log(`Added ${openingHours.length} opening hours for: ${record.name}`);
      }
      
      // Process online sales links if they exist
      const onlineSalesLinks = [];
      let platformIndex = 1;
      
      while (record[`online_sales_platform${platformIndex}`]) {
        const platform = record[`online_sales_platform${platformIndex}`];
        const url = record[`online_sales_url${platformIndex}`];
        const description = record[`online_sales_desc${platformIndex}`] || null;
        
        if (platform && url) {
          onlineSalesLinks.push({
            place_id: place.id,
            platform_name: platform,
            url: url,
            description: description,
          });
        }
        
        platformIndex++;
      }
      
      if (onlineSalesLinks.length > 0) {
        await bulkCreateOnlineSalesLinks(onlineSalesLinks);
        console.log(`Added ${onlineSalesLinks.length} online sales links for: ${record.name}`);
      }
      
      importedCount++;
    } catch (error) {
      console.error(`Error importing record ${record.name}:`, error);
    }
  }
  
  console.log(`Import complete. Successfully imported ${importedCount} places.`);
}

// Check if a filename was provided as a command line argument
const args = process.argv.slice(2);
if (args.length !== 1) {
  console.error('Usage: ts-node import-csv.ts <path-to-csv-file>');
  process.exit(1);
}

const filePath = args[0];
if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

importCsv(filePath).catch(error => {
  console.error('Import failed:', error);
  process.exit(1);
});

// update-coordinates.js
// A script to update coordinates for places that have default or incorrect coordinates

const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs');

// Database path - using same path as in src/lib/db.ts
const dataDir = path.join(process.cwd(), 'data');
const DB_PATH = path.join(dataDir, 'edinburgh-antiques.db');

if (!fs.existsSync(DB_PATH)) {
  console.error(`Database file not found at: ${DB_PATH}`);
  process.exit(1);
}

// Helper function to open database connection
async function openDb() {
  return open({
    filename: DB_PATH,
    driver: sqlite3.Database
  });
}

// Function to find places with default coordinates
async function findDefaultCoordinates() {
  const db = await openDb();
  const places = await db.all(`
    SELECT p.*, pt.name as type_name
    FROM places p
    LEFT JOIN place_types pt ON p.type_id = pt.id
    WHERE p.lat = 55.9533 AND p.lng = -3.1883
    ORDER BY p.id ASC;
  `);
  await db.close();
  return places;
}

// Function to update coordinates for a specific place
async function updateCoordinates(id, lat, lng) {
  const db = await openDb();
  
  try {
    // Get current place info for logging
    const place = await db.get('SELECT * FROM places WHERE id = ?', [id]);
    
    console.log(`Updating coordinates for place ID ${id} (${place?.name || 'Unknown'}):`);
    console.log(`  From: lat=${place?.lat}, lng=${place?.lng}`);
    console.log(`  To:   lat=${lat}, lng=${lng}`);
    
    // Update the coordinates
    const result = await db.run(
      'UPDATE places SET lat = ?, lng = ? WHERE id = ?',
      [lat, lng, id]
    );
    
    console.log(`  Result: ${result.changes} row(s) updated`);
    
    // Verify the update worked
    if (result.changes > 0) {
      const updated = await db.get('SELECT * FROM places WHERE id = ?', [id]);
      console.log(`  Verified coordinates: lat=${updated.lat}, lng=${updated.lng}`);
    }
    
    await db.close();
    return result.changes > 0;
  } catch (error) {
    console.error('Error updating coordinates:', error);
    await db.close();
    return false;
  }
}

// Function to update multiple places from a JSON file
async function updateFromFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.error(`Coordinates file not found: ${filePath}`);
      return false;
    }
    
    const data = fs.readFileSync(filePath, 'utf8');
    const coordinates = JSON.parse(data);
    
    let successCount = 0;
    let failCount = 0;
    
    console.log(`\nUpdating coordinates for ${Object.keys(coordinates).length} places from file...`);
    
    for (const [id, coords] of Object.entries(coordinates)) {
      const placeId = parseInt(id);
      if (isNaN(placeId) || !coords.lat || !coords.lng) {
        console.error(`Invalid entry for ID ${id}: ${JSON.stringify(coords)}`);
        failCount++;
        continue;
      }
      
      const success = await updateCoordinates(placeId, coords.lat, coords.lng);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
    }
    
    console.log(`\nUpdate complete: ${successCount} successful, ${failCount} failed`);
    return successCount > 0;
  } catch (error) {
    console.error('Error updating from file:', error);
    return false;
  }
}

// Function to create a template file for coordinates update
async function createTemplateFile() {
  try {
    const defaultPlaces = await findDefaultCoordinates();
    
    if (defaultPlaces.length === 0) {
      console.log('No places with default coordinates found!');
      return;
    }
    
    console.log(`Found ${defaultPlaces.length} places with default coordinates (55.9533, -3.1883)`);
    
    // Create a template object with all places using default coordinates
    const template = {};
    defaultPlaces.forEach(place => {
      template[place.id] = {
        name: place.name,
        address: place.address,
        current: { lat: place.lat, lng: place.lng },
        // Template for new coordinates (initially same as current)
        lat: place.lat,
        lng: place.lng
      };
    });
    
    const templatePath = path.join(process.cwd(), 'coordinate-updates.json');
    fs.writeFileSync(templatePath, JSON.stringify(template, null, 2), 'utf8');
    
    console.log(`\nCreated template file at ${templatePath}`);
    console.log('Edit this file to add correct coordinates, then run:');
    console.log('  node scripts/update-coordinates.js update coordinate-updates.json');
    
    return templatePath;
  } catch (error) {
    console.error('Error creating template file:', error);
    return null;
  }
}

// Main function to run the script
async function main() {
  const args = process.argv.slice(2);
  const command = args[0]?.toLowerCase();
  
  if (command === 'list-default') {
    // Find places with default coordinates
    const defaultPlaces = await findDefaultCoordinates();
    
    console.log('\n===== PLACES WITH DEFAULT COORDINATES =====');
    console.log(`Found ${defaultPlaces.length} places with default coordinates (55.9533, -3.1883)`);
    
    if (defaultPlaces.length > 0) {
      console.log('\nID | Name | Address');
      console.log('---|------|--------');
      defaultPlaces.forEach(place => {
        console.log(`${place.id} | ${place.name} | ${place.address}`);
      });
    }
  }
  else if (command === 'create-template') {
    // Create a template file for updating coordinates
    await createTemplateFile();
  }
  else if (command === 'update' && args.length === 3) {
    // Update a single place: node update-coordinates.js update <id> <lat> <lng>
    const id = parseInt(args[1]);
    const lat = parseFloat(args[2]);
    const lng = parseFloat(args[3]);
    
    if (isNaN(id) || isNaN(lat) || isNaN(lng)) {
      console.error('Invalid parameters. Usage: node update-coordinates.js update <id> <lat> <lng>');
      process.exit(1);
    }
    
    const success = await updateCoordinates(id, lat, lng);
    console.log(success ? 
      `Successfully updated place ID ${id} to lat=${lat}, lng=${lng}` : 
      `Failed to update place ID ${id}`
    );
  }
  else if (command === 'update' && args.length === 2) {
    // Update multiple places from a JSON file
    const filePath = args[1];
    await updateFromFile(filePath);
  }
  else {
    console.log(`
Edinburgh Antiques Trail Coordinate Update Utility
=================================================

Commands:
  node update-coordinates.js list-default
    - List all places with default coordinates (55.9533, -3.1883)
    
  node update-coordinates.js create-template
    - Create a template JSON file with all places using default coordinates
    - Edit this file to provide correct coordinates
    
  node update-coordinates.js update <id> <lat> <lng>
    - Update coordinates for a specific place
    - Example: node update-coordinates.js update 81 55.950667 -3.188926
    
  node update-coordinates.js update <file.json>
    - Update multiple places using a JSON file
    - Example: node update-coordinates.js update coordinate-updates.json
    
For the JSON file format, use:
{
  "81": { "lat": 55.950667, "lng": -3.188926 },
  "82": { "lat": 55.962782, "lng": -3.177650 }
}
`);
  }
}

// Run the script
main().catch(console.error);

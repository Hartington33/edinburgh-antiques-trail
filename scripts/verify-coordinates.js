// verify-coordinates.js
// A utility script to verify and update coordinates for all places

const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

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

// Function to get all places
async function getAllPlaces() {
  const db = await openDb();
  const places = await db.all(`
    SELECT p.*, pt.name as type_name
    FROM places p
    LEFT JOIN place_types pt ON p.type_id = pt.id
    ORDER BY p.id ASC;
  `);
  await db.close();
  return places;
}

// Function to update a place's coordinates
async function updatePlaceCoordinates(id, lat, lng) {
  const db = await openDb();
  console.log(`Updating place ID ${id} with coordinates: lat=${lat}, lng=${lng}`);
  
  try {
    const result = await db.run(
      'UPDATE places SET lat = ?, lng = ? WHERE id = ?',
      [lat, lng, id]
    );
    
    console.log(`Update result: ${result.changes} row(s) modified`);
    await db.close();
    return result.changes > 0;
  } catch (error) {
    console.error('Error updating coordinates:', error);
    await db.close();
    return false;
  }
}

// Function to display all places with their coordinates
async function displayAllPlaces() {
  try {
    const places = await getAllPlaces();
    
    console.log('\n===== PLACE COORDINATES =====');
    console.log(`Total places found: ${places.length}`);
    console.log('----------------------------');
    
    places.forEach(place => {
      console.log(`ID: ${place.id} | Name: ${place.name}`);
      console.log(`  Type: ${place.type_name || 'Unknown'}`);
      console.log(`  Address: ${place.address}`);
      console.log(`  Coordinates: lat=${place.lat}, lng=${place.lng}`);
      console.log('----------------------------');
    });
    
    return places;
  } catch (error) {
    console.error('Error fetching places:', error);
    return [];
  }
}

// Main function to run the utility
async function main() {
  const args = process.argv.slice(2);
  const command = args[0]?.toLowerCase();
  
  if (command === 'list') {
    // Just list all places and their coordinates
    await displayAllPlaces();
  }
  else if (command === 'update' && args.length === 4) {
    // Update a specific place: node verify-coordinates.js update <id> <lat> <lng>
    const id = parseInt(args[1]);
    const lat = parseFloat(args[2]);
    const lng = parseFloat(args[3]);
    
    if (isNaN(id) || isNaN(lat) || isNaN(lng)) {
      console.error('Invalid arguments. Usage: node verify-coordinates.js update <id> <lat> <lng>');
      process.exit(1);
    }
    
    const success = await updatePlaceCoordinates(id, lat, lng);
    if (success) {
      console.log(`Successfully updated coordinates for place ID ${id}`);
    } else {
      console.error(`Failed to update coordinates for place ID ${id}`);
    }
  }
  else {
    console.log(`
Edinburgh Antiques Trail Coordinate Verification Utility
======================================================

Commands:
  node verify-coordinates.js list
    - Lists all places with their current coordinates
    
  node verify-coordinates.js update <id> <lat> <lng>
    - Updates coordinates for a specific place
    - Example: node verify-coordinates.js update 17 55.95503166214517 -3.210047905254123
    
To update multiple places, run the update command for each place ID.
`);
  }
}

// Run the script
main().catch(console.error);

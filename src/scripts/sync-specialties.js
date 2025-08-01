// This script synchronizes all places' specialty text with the place_specialties junction table

// Import the SQLite library directly for the script
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Use the same path logic as the main app
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'edinburgh-antiques.db');

// Open the database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to database:', err);
    process.exit(1);
  }
  console.log('Connected to database at', dbPath);
});

// Promisify db.all and db.run
function dbAll(query, params = []) {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function dbRun(query, params = []) {
  return new Promise((resolve, reject) => {
    db.run(query, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function dbGet(query, params = []) {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// Save specialties for a place
async function saveSpecialtiesForPlace(placeId, specialtyIds) {
  try {
    // Start a transaction
    await dbRun('BEGIN TRANSACTION');
    
    // Delete existing specialties for this place
    await dbRun('DELETE FROM place_specialties WHERE place_id = ?', [placeId]);
    
    // Insert the new associations
    for (const specialtyId of specialtyIds) {
      await dbRun(
        'INSERT INTO place_specialties (place_id, specialty_id) VALUES (?, ?)',
        [placeId, specialtyId]
      );
    }
    
    // Commit the transaction
    await dbRun('COMMIT');
    return true;
  } catch (error) {
    // Rollback in case of error
    await dbRun('ROLLBACK');
    console.error('Error saving specialties:', error);
    return false;
  }
}

// Synchronize specialties from text to junction table
async function syncSpecialtiesFromText(placeId, specialtiesText) {
  if (!specialtiesText || specialtiesText.trim() === '') {
    // If no specialties text is provided, just clear the place's specialties
    return await saveSpecialtiesForPlace(placeId, []);
  }
  
  const specialtyNames = specialtiesText.split(',').map(s => s.trim()).filter(s => s !== '');
  
  if (specialtyNames.length === 0) {
    return await saveSpecialtiesForPlace(placeId, []);
  }
  
  try {
    // First, find existing specialties
    const specialtyIdsToSave = [];
    
    for (const name of specialtyNames) {
      // Find existing specialty or create a new one
      const specialty = await dbGet('SELECT id FROM specialties WHERE name = ? COLLATE NOCASE', [name]);
      
      if (specialty) {
        console.log(`Found existing specialty '${name}' with ID ${specialty.id}`);
        specialtyIdsToSave.push(specialty.id);
      } else {
        // Create new specialty if it doesn't exist
        console.log(`Creating new specialty '${name}'`);
        const result = await dbRun(
          'INSERT INTO specialties (name) VALUES (?)', 
          [name]
        );
        if (result.lastID) {
          console.log(`Created new specialty '${name}' with ID ${result.lastID}`);
          specialtyIdsToSave.push(result.lastID);
        }
      }
    }
    
    console.log(`Saving specialty IDs for place ${placeId}: ${specialtyIdsToSave.join(', ')}`);
    
    // Save the specialty IDs to the place_specialties table
    return await saveSpecialtiesForPlace(placeId, specialtyIdsToSave);
  } catch (error) {
    console.error('Error syncing specialties from text:', error);
    return false;
  }
}

// Main function to synchronize all place specialties
async function syncAllPlaceSpecialties() {
  console.log('Starting specialty synchronization...');
  
  try {
    // Debug: Check if the place_specialties table exists
    const tables = await dbAll("SELECT name FROM sqlite_master WHERE type='table' AND name='place_specialties'");
    console.log('place_specialties table check:', tables);
    
    // Debug: Check if specialties table exists and get all specialties
    const specialties = await dbAll("SELECT * FROM specialties");
    console.log('Existing specialties:', specialties);
    
    // Get all places that have specialties
    console.log('Fetching places with specialties...');
    const places = await dbAll('SELECT id, name, specialties FROM places WHERE specialties IS NOT NULL AND specialties != ""');
    console.log(`Found ${places.length} places with specialty text to sync:`);
    places.forEach(p => console.log(`- ID ${p.id}: "${p.name}" with specialties: "${p.specialties}"`));
    
    let successCount = 0;
    let errorCount = 0;
    
    // Process each place
    for (const place of places) {
      try {
        const success = await syncSpecialtiesFromText(place.id, place.specialties);
        if (success) {
          successCount++;
          console.log(`✅ Synced place ID ${place.id} with specialties: ${place.specialties}`);
        } else {
          errorCount++;
          console.log(`❌ Failed to sync place ID ${place.id} with specialties: ${place.specialties}`);
        }
      } catch (error) {
        errorCount++;
        console.error(`❌ Error syncing place ID ${place.id}:`, error);
      }
    }
    
    // Print final report
    console.log('\n----- Sync Complete -----');
    console.log(`Total places processed: ${places.length}`);
    console.log(`Successful: ${successCount}`);
    console.log(`Failed: ${errorCount}`);
    
  } catch (error) {
    console.error('Error in sync process:', error);
  } finally {
    // Close the database connection
    db.close();
  }
}

// Run the sync function
console.log('Script started');
syncAllPlaceSpecialties()
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Script failed with error:', error);
    process.exit(1);
  });

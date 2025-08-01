import { getDb } from '../lib/db';
import { syncSpecialtiesFromText } from '../lib/specialty-utils';

// Log uncaught exceptions for better debugging
process.on('uncaughtException', (error) => {
  console.error('UNCAUGHT EXCEPTION:', error);
});

// This script will synchronize all places' specialty text with the place_specialties junction table

async function syncAllPlaceSpecialties() {
  console.log('Starting specialty synchronization...');
  
  let db;
  try {
    console.log('Getting database connection...');
    db = await getDb();
    console.log('Database connection established.');
    
    // Debug: Check if the place_specialties table exists
    const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='place_specialties'");
    console.log('place_specialties table check:', tables);
    
    // Debug: Check if specialties table exists and get all specialties
    const specialties = await db.all("SELECT * FROM specialties");
    console.log('Existing specialties:', specialties);
    
    // Get all places that have specialties
    console.log('Fetching places with specialties...');
    const places = await db.all('SELECT id, name, specialties FROM places WHERE specialties IS NOT NULL AND specialties != ""');
    console.log(`Found ${places.length} places with specialty text to sync:`, places);
    
    let successCount = 0;
    let errorCount = 0;
    
    // Process each place
    for (const place of places) {
      try {
        const success = await syncSpecialtiesFromText(place.id, place.specialties);
        if (success) {
          successCount++;
          console.log(`Synced place ID ${place.id} with specialties: ${place.specialties}`);
        } else {
          errorCount++;
          console.log(`Failed to sync place ID ${place.id} with specialties: ${place.specialties}`);
        }
      } catch (error) {
        errorCount++;
        console.error(`Error syncing place ID ${place.id}:`, error);
      }
    }
    
    // Print final report
    console.log('\n----- Sync Complete -----');
    console.log(`Total places processed: ${places.length}`);
    console.log(`Successful: ${successCount}`);
    console.log(`Failed: ${errorCount}`);
    
  } catch (error) {
    console.error('Error in sync process:', error);
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

// Script to ensure specialty data integrity between text and junction table
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Path to database
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'edinburgh-antiques.db');
console.log(`Using database at: ${dbPath}`);

// Connect to database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to database:', err);
    process.exit(1);
  }
  console.log('Connected to database');
});

// Promisify database methods
function dbRun(query, params = []) {
  return new Promise((resolve, reject) => {
    db.run(query, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function dbAll(query, params = []) {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
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

async function repairSpecialtiesData() {
  console.log('===========================================');
  console.log('SPECIALTY DATA REPAIR AND SYNCHRONIZATION');
  console.log('===========================================');
  
  try {
    // 1. Make sure all specialty names in the junction table are also in the text fields
    console.log('\nSynchronizing specialties from junction table to text fields...');
    
    // Get all places
    const places = await dbAll('SELECT id, name, specialties FROM places');
    
    for (const place of places) {
      console.log(`\nProcessing place ID ${place.id}: ${place.name}`);
      
      // Get the specialty IDs for this place from the junction table
      const specialtyRows = await dbAll(
        'SELECT s.id, s.name FROM specialties s JOIN place_specialties ps ON s.id = ps.specialty_id WHERE ps.place_id = ?',
        [place.id]
      );
      
      if (specialtyRows.length === 0) {
        console.log('  No specialties in junction table');
        continue;
      }
      
      // Build a list of specialty names
      const specialtyNames = specialtyRows.map(s => s.name);
      const specialtyText = specialtyNames.join(', ');
      
      console.log(`  Found ${specialtyNames.length} specialties in junction table: ${specialtyText}`);
      console.log(`  Current text field: "${place.specialties || ''}"`);
      
      // Update the text field if it's different
      if (place.specialties !== specialtyText) {
        console.log(`  Updating specialties text field to: "${specialtyText}"`);
        await dbRun(
          'UPDATE places SET specialties = ? WHERE id = ?',
          [specialtyText, place.id]
        );
      } else {
        console.log('  Text field is already in sync');
      }
    }
    
    // 2. Specifically check Silver specialty
    console.log('\n===========================================');
    console.log('SILVER SPECIALTY CHECK');
    console.log('===========================================');
    
    // Find Silver specialty ID
    const silverSpecialty = await dbGet("SELECT * FROM specialties WHERE name = 'Silver' OR name LIKE '%Silver%' COLLATE NOCASE");
    
    if (!silverSpecialty) {
      console.log('Creating Silver specialty...');
      const result = await dbRun(
        "INSERT INTO specialties (name, description) VALUES (?, ?)",
        ["Silver", "Silver items and silverware"]
      );
      console.log(`Created with ID: ${result.lastID}`);
      silverSpecialty = await dbGet("SELECT * FROM specialties WHERE id = ?", [result.lastID]);
    }
    
    console.log(`Silver specialty ID: ${silverSpecialty.id}, Name: "${silverSpecialty.name}"`);
    
    // Find places with Silver in their text field
    const placesWithSilverText = await dbAll(
      "SELECT id, name, specialties FROM places WHERE specialties LIKE '%Silver%' COLLATE NOCASE"
    );
    
    console.log(`\nFound ${placesWithSilverText.length} places with "Silver" in their specialties text`);
    
    // Add Silver specialty ID to these places if missing
    let fixedCount = 0;
    
    for (const place of placesWithSilverText) {
      // Check if already in junction table
      const hasJunction = await dbGet(
        "SELECT 1 FROM place_specialties WHERE place_id = ? AND specialty_id = ?",
        [place.id, silverSpecialty.id]
      );
      
      if (!hasJunction) {
        console.log(`  Adding Silver specialty to place ID ${place.id}: ${place.name}`);
        await dbRun(
          "INSERT INTO place_specialties (place_id, specialty_id) VALUES (?, ?)",
          [place.id, silverSpecialty.id]
        );
        fixedCount++;
      }
    }
    
    // Final verification
    const placesWithSilverJunction = await dbAll(
      "SELECT p.id, p.name FROM places p JOIN place_specialties ps ON p.id = ps.place_id WHERE ps.specialty_id = ?",
      [silverSpecialty.id]
    );
    
    console.log('\n===========================================');
    console.log('RESULTS');
    console.log('===========================================');
    console.log(`Places with Silver in junction table: ${placesWithSilverJunction.length}`);
    console.log(`Fixed ${fixedCount} missing connections`);
    
    if (placesWithSilverJunction.length > 0) {
      console.log('\nPlaces with Silver specialty:');
      for (const place of placesWithSilverJunction) {
        console.log(`  - ${place.name} (ID: ${place.id})`);
      }
    }
    
    console.log('\nRepair completed successfully!');
    
  } catch (error) {
    console.error('Error during repair:', error);
  } finally {
    db.close();
    console.log('\nDatabase connection closed');
  }
}

// Run the repair process
repairSpecialties().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

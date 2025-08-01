// Script to fix the Silver specialty filtering issue
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Use the same path logic as the main app
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'edinburgh-antiques.db');
console.log(`Using database at: ${dbPath}`);

// Open the database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to database:', err);
    process.exit(1);
  }
  console.log('Connected to database');
});

// Promisify database operations
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

async function fixSilverSpecialty() {
  console.log('=======================================');
  console.log('FIXING SILVER SPECIALTY FILTERING ISSUE');
  console.log('=======================================');
  
  try {
    // 1. Check if Silver specialty exists
    console.log('Step 1: Checking for Silver specialty...');
    let silverSpecialty = await dbGet("SELECT * FROM specialties WHERE name LIKE '%Silver%' COLLATE NOCASE");
    
    // If Silver specialty doesn't exist, create it
    if (!silverSpecialty) {
      console.log('Silver specialty not found. Creating it...');
      const result = await dbRun(
        "INSERT INTO specialties (name, description) VALUES (?, ?)",
        ["Silver", "Specialist in silver items and silverware"]
      );
      silverSpecialty = await dbGet("SELECT * FROM specialties WHERE id = ?", [result.lastID]);
      console.log(`Created new Silver specialty with ID ${silverSpecialty.id}`);
    } else {
      console.log(`Found existing Silver specialty with ID ${silverSpecialty.id}`);
    }
    
    // 2. Find places with Silver in their specialties text field
    console.log('\nStep 2: Finding places with Silver in their specialties text...');
    const placesWithSilver = await dbAll(
      "SELECT id, name, specialties FROM places WHERE specialties LIKE '%Silver%' COLLATE NOCASE"
    );
    console.log(`Found ${placesWithSilver.length} places with Silver in their specialties text`);
    
    // 3. Check which places are missing Silver in the junction table
    console.log('\nStep 3: Checking junction table for Silver connections...');
    const results = [];
    
    for (const place of placesWithSilver) {
      const hasJunctionEntry = await dbGet(
        "SELECT * FROM place_specialties WHERE place_id = ? AND specialty_id = ?",
        [place.id, silverSpecialty.id]
      );
      
      if (!hasJunctionEntry) {
        console.log(`Place ID ${place.id} (${place.name}) is missing Silver in junction table. Adding it...`);
        await dbRun(
          "INSERT INTO place_specialties (place_id, specialty_id) VALUES (?, ?)",
          [place.id, silverSpecialty.id]
        );
        results.push({ id: place.id, name: place.name, status: 'FIXED' });
      } else {
        console.log(`Place ID ${place.id} (${place.name}) already has Silver in junction table`);
        results.push({ id: place.id, name: place.name, status: 'OK' });
      }
    }
    
    // 4. Final check for Silver specialty connections
    const connections = await dbAll(
      "SELECT p.id, p.name FROM places p JOIN place_specialties ps ON p.id = ps.place_id WHERE ps.specialty_id = ?",
      [silverSpecialty.id]
    );
    
    console.log('\n=======================================');
    console.log('RESULTS');
    console.log('=======================================');
    console.log(`Silver specialty ID: ${silverSpecialty.id}`);
    console.log(`Places with Silver in text field: ${placesWithSilver.length}`);
    console.log(`Places connected to Silver in junction table: ${connections.length}`);
    
    // Summary of actions taken
    console.log('\nActions taken:');
    const fixed = results.filter(r => r.status === 'FIXED').length;
    console.log(`- Added Silver to ${fixed} places in junction table`);
    
    // List places that now have Silver
    console.log('\nPlaces with Silver specialty:');
    connections.forEach(place => {
      console.log(`- ID ${place.id}: ${place.name}`);
    });
    
    console.log('\n=======================================');
    if (fixed > 0) {
      console.log('SUCCESS: Fixed Silver specialty connections!');
    } else if (connections.length > 0) {
      console.log('SUCCESS: Silver specialty connections were already correct');
    } else {
      console.log('WARNING: No places have Silver specialty after fix attempt');
    }
    console.log('=======================================');
    
  } catch (error) {
    console.error('Error fixing Silver specialty:', error);
  } finally {
    db.close();
    console.log('\nDatabase connection closed');
  }
}

// Run the fix
fixSilverSpecialty().catch(console.error);

// Debug script to investigate specialty filtering issues

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

// Promisify db.all
function dbAll(query, params = []) {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// Debug function to check specialties
async function debugSpecialtyFiltering() {
  console.log('========= SPECIALTY DEBUGGING =========');
  try {
    // Check if Silver specialty exists
    const silverSpecialty = await dbAll("SELECT * FROM specialties WHERE name LIKE '%Silver%' COLLATE NOCASE");
    console.log('Silver specialty records:', silverSpecialty);

    if (silverSpecialty.length > 0) {
      const silverId = silverSpecialty[0].id;
      console.log(`\nFound Silver specialty with ID: ${silverId}`);
      
      // Check for places with Silver in text
      const placesWithSilverText = await dbAll("SELECT id, name, specialties FROM places WHERE specialties LIKE '%Silver%' COLLATE NOCASE");
      console.log(`\nPlaces with 'Silver' in specialties text (${placesWithSilverText.length}):`);
      console.log(placesWithSilverText);
      
      // Check for places with Silver in junction table
      const placesWithSilverJunction = await dbAll(
        "SELECT p.id, p.name, p.specialties FROM places p JOIN place_specialties ps ON p.id = ps.place_id WHERE ps.specialty_id = ?",
        [silverId]
      );
      console.log(`\nPlaces with Silver specialty ID in junction table (${placesWithSilverJunction.length}):`);
      console.log(placesWithSilverJunction);
      
      // Check all specialty IDs for a specific place
      if (placesWithSilverText.length > 0) {
        const samplePlaceId = placesWithSilverText[0].id;
        const placeSpecialties = await dbAll(
          "SELECT ps.specialty_id, s.name FROM place_specialties ps JOIN specialties s ON ps.specialty_id = s.id WHERE ps.place_id = ?",
          [samplePlaceId]
        );
        console.log(`\nAll specialties for place ID ${samplePlaceId}:`);
        console.log(placeSpecialties);
      }
      
      // Debug the actual SQL query we use for filters
      console.log('\nSimulating the filtered query:');
      const simulatedQuery = `
        SELECT p.* 
        FROM places p 
        JOIN place_specialties ps ON p.id = ps.place_id
        WHERE ps.specialty_id = ?
        GROUP BY p.id
        HAVING COUNT(DISTINCT ps.specialty_id) >= 1
      `;
      const filteredPlaces = await dbAll(simulatedQuery, [silverId]);
      console.log(`Results count: ${filteredPlaces.length}`);
      if (filteredPlaces.length > 0) {
        console.log('Query results (first 3):');
        console.log(filteredPlaces.slice(0, 3));
      }
    }

    // Check all specialty records in the database
    const allSpecialties = await dbAll("SELECT * FROM specialties ORDER BY name");
    console.log('\nAll specialties in database:');
    console.log(allSpecialties);
    
    // Check place_specialties junction table content
    const junctionEntries = await dbAll("SELECT COUNT(*) as count FROM place_specialties");
    console.log(`\nTotal entries in place_specialties junction table: ${junctionEntries[0].count}`);
    
    // Sample of junction table
    const junctionSample = await dbAll("SELECT * FROM place_specialties LIMIT 10");
    console.log('Sample of junction table:');
    console.log(junctionSample);
    
  } catch (error) {
    console.error('Error during debugging:', error);
  } finally {
    db.close();
    console.log('\nDatabase connection closed.');
  }
}

// Run the debugging
debugSpecialtyFiltering().catch(console.error);

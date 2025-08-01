// Script to reset Silver specialty to only specific places
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(process.cwd(), 'data', 'edinburgh-antiques.db');
console.log(`Using database at: ${dbPath}`);

const db = new sqlite3.Database(dbPath);

async function run() {
  try {
    console.log("===== RESETTING SILVER SPECIALTY =====");
    
    // Step 1: First remove Silver specialty from ALL places
    console.log("\nStep 1: Removing Silver specialty from all places");
    await run("DELETE FROM place_specialties WHERE specialty_id = 4");
    console.log("✅ Removed all existing Silver specialty links");
    
    // Step 2: Select only two specific places to have Silver
    // We'll choose places that might reasonably sell silver items
    const placeResults = await all("SELECT id, name FROM places WHERE name LIKE '%Alan%' OR name LIKE '%Town Antiques%' LIMIT 2");
    
    if (placeResults.length === 0) {
      console.log("⚠️ Could not find sample places for Silver, using first two places instead");
      // Fallback to first two places
      const fallbackResults = await all("SELECT id, name FROM places LIMIT 2");
      if (fallbackResults.length === 0) {
        throw new Error("No places found in database!");
      }
      placeResults.push(...fallbackResults);
    }
    
    console.log(`\nStep 2: Selected ${placeResults.length} places for Silver specialty:`);
    const selectedPlaceIds = placeResults.map(p => p.id);
    placeResults.forEach(p => console.log(`- ID=${p.id}, Name="${p.name}"`));
    
    // Step 3: Add Silver specialty to selected places
    console.log("\nStep 3: Adding Silver specialty to selected places");
    for (const placeId of selectedPlaceIds) {
      await run("INSERT INTO place_specialties (place_id, specialty_id) VALUES (?, 4)", [placeId]);
      console.log(`✅ Added Silver specialty to place ID=${placeId}`);
      
      // Update the specialties text field to include Silver
      const place = await get("SELECT specialties FROM places WHERE id = ?", [placeId]);
      let specialtiesText = place.specialties || '';
      
      if (!specialtiesText.toLowerCase().includes('silver')) {
        if (specialtiesText && specialtiesText.trim() !== '') {
          specialtiesText += ', Silver';
        } else {
          specialtiesText = 'Silver';
        }
        
        await run("UPDATE places SET specialties = ? WHERE id = ?", [specialtiesText, placeId]);
        console.log(`✅ Updated specialties text for place ID=${placeId}: "${specialtiesText}"`);
      }
    }
    
    // Step 4: Verify results
    console.log("\nStep 4: Verifying results");
    const result = await all(`
      SELECT p.id, p.name, p.specialties
      FROM places p
      JOIN place_specialties ps ON p.id = ps.place_id
      WHERE ps.specialty_id = 4
    `);
    
    console.log(`\n🎯 SILVER FILTER SHOULD NOW RETURN ONLY ${result.length} PLACES:`);
    result.forEach(p => console.log(`- ID=${p.id}, Name="${p.name}", Specialties="${p.specialties}"`));
    
    console.log("\nSilver specialty has been successfully reset!");
    console.log("Please refresh the page and try filtering by Silver again.");
    
  } finally {
    db.close();
  }
}

// Helper functions to use promises with sqlite
function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

run().catch(err => {
  console.error("Error:", err);
  db.close();
});

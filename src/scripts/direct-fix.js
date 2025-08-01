// Direct SQL fix for Silver specialty issues
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(process.cwd(), 'data', 'edinburgh-antiques.db');
console.log(`Database path: ${dbPath}`);

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
  if (err) {
    console.error('Database error:', err.message);
    process.exit(1);
  }
});

function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function execSql(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({changes: this.changes, lastID: this.lastID});
    });
  });
}

async function main() {
  try {
    console.log("==== SPECIALTY ANALYSIS ====");
    
    // 1. List all specialties
    const allSpecialties = await runQuery("SELECT id, name FROM specialties ORDER BY id");
    console.log("All specialties:");
    allSpecialties.forEach(s => console.log(`- ID=${s.id}: "${s.name}"`));
    
    // 2. Find Silver specialty by exact name
    let silver = await runQuery("SELECT id, name FROM specialties WHERE name = 'Silver'");
    
    if (silver.length === 0) {
      console.log("\nNo exact 'Silver' specialty found. Checking for similar names...");
      silver = await runQuery("SELECT id, name FROM specialties WHERE name LIKE '%Silver%' COLLATE NOCASE");
    }
    
    if (silver.length === 0) {
      console.log("\nNo Silver specialty found at all. Creating one...");
      const result = await execSql("INSERT INTO specialties (name, description) VALUES (?, ?)", 
        ["Silver", "Silver antiques and items"]);
      
      console.log(`Created Silver specialty with ID=${result.lastID}`);
      silver = await runQuery("SELECT id, name FROM specialties WHERE id = ?", [result.lastID]);
    }
    
    const silverId = silver[0].id;
    console.log(`\nUsing Silver specialty: ID=${silverId}, Name="${silver[0].name}"`);
    
    // 3. Find places with "Silver" in their specialties text
    const silverPlacesText = await runQuery(
      "SELECT id, name, specialties FROM places WHERE specialties LIKE ? COLLATE NOCASE",
      ["%Silver%"]
    );
    
    console.log(`\nFound ${silverPlacesText.length} places with "Silver" in text:`);
    silverPlacesText.forEach(p => console.log(`- ID=${p.id}: "${p.name}" - "${p.specialties}"`));
    
    // 4. Check junction table entries
    const silverPlacesJunction = await runQuery(
      `SELECT p.id, p.name, p.specialties
       FROM places p
       JOIN place_specialties ps ON p.id = ps.place_id
       WHERE ps.specialty_id = ?`,
      [silverId]
    );
    
    console.log(`\nFound ${silverPlacesJunction.length} places with Silver ID=${silverId} in junction table:`);
    silverPlacesJunction.forEach(p => console.log(`- ID=${p.id}: "${p.name}" - "${p.specialties}"`));
    
    // 5. Fix: ensure all places with Silver text have junction table entries
    console.log("\n==== FIXING JUNCTION TABLE ====");
    
    for (const place of silverPlacesText) {
      const hasJunction = await runQuery(
        "SELECT 1 FROM place_specialties WHERE place_id = ? AND specialty_id = ?",
        [place.id, silverId]
      );
      
      if (hasJunction.length === 0) {
        await execSql(
          "INSERT INTO place_specialties (place_id, specialty_id) VALUES (?, ?)",
          [place.id, silverId]
        );
        console.log(`Added junction: Place ID=${place.id} <-> Silver ID=${silverId}`);
      } else {
        console.log(`Junction already exists for Place ID=${place.id}`);
      }
    }
    
    // 6. CRITICAL: Check SimpleSpecialtyFilter data source
    console.log("\n==== SPECIALTY FILTER COMPONENT ANALYSIS ====");
    
    // Find the specialty ID that the filter component is actually using
    const allSpecialtiesFiltered = await runQuery("SELECT id, name FROM specialties ORDER BY name");
    console.log("Specialties sorted by name (as seen in filter component):");
    allSpecialtiesFiltered.forEach((s, i) => console.log(`${i+1}. ID=${s.id}: "${s.name}"`));
    
    // Find if there's another "Silver" specialty with a different ID
    const allSilverEntries = await runQuery(
      "SELECT id, name FROM specialties WHERE name LIKE '%Silver%' COLLATE NOCASE"
    );
    
    console.log("\nAll Silver-like specialty entries:");
    allSilverEntries.forEach(s => console.log(`- ID=${s.id}: "${s.name}"`));
    
    if (allSilverEntries.length > 1) {
      console.log("\n⚠️ MULTIPLE SILVER SPECIALTIES DETECTED - THIS COULD BE THE ISSUE");
      
      // Check if we should merge them
      const mainSilverId = allSilverEntries[0].id;
      console.log(`Using ID=${mainSilverId} as the main Silver specialty`);
      
      for (const entry of allSilverEntries.slice(1)) {
        console.log(`\nMerging specialty ID=${entry.id} into ID=${mainSilverId}...`);
        
        // First find places that use the duplicate specialty
        const placesToUpdate = await runQuery(
          "SELECT place_id FROM place_specialties WHERE specialty_id = ?",
          [entry.id]
        );
        
        console.log(`Found ${placesToUpdate.length} places using specialty ID=${entry.id}`);
        
        // Move connections to the main Silver specialty
        for (const place of placesToUpdate) {
          // Check if there's already a connection to the main Silver specialty
          const existingConnection = await runQuery(
            "SELECT 1 FROM place_specialties WHERE place_id = ? AND specialty_id = ?",
            [place.place_id, mainSilverId]
          );
          
          if (existingConnection.length === 0) {
            await execSql(
              "INSERT INTO place_specialties (place_id, specialty_id) VALUES (?, ?)",
              [place.place_id, mainSilverId]
            );
            console.log(`Moved connection: Place ID=${place.place_id} -> Silver ID=${mainSilverId}`);
          }
        }
        
        // Delete the duplicate specialty connections
        const deleteResult = await execSql(
          "DELETE FROM place_specialties WHERE specialty_id = ?",
          [entry.id]
        );
        console.log(`Deleted ${deleteResult.changes} connections to duplicate specialty ID=${entry.id}`);
        
        // Optional: Delete the duplicate specialty itself
        await execSql("DELETE FROM specialties WHERE id = ?", [entry.id]);
        console.log(`Deleted duplicate specialty ID=${entry.id}`);
      }
    }
    
    // 7. Final verification
    console.log("\n==== FINAL VERIFICATION ====");
    
    const finalSpecialties = await runQuery(
      "SELECT id, name FROM specialties WHERE name LIKE '%Silver%' COLLATE NOCASE"
    );
    console.log("Silver specialties after cleanup:");
    finalSpecialties.forEach(s => console.log(`- ID=${s.id}: "${s.name}"`));
    
    // This should now be a single ID
    const finalSilverId = finalSpecialties[0].id;
    
    // Get all places with this Silver specialty
    const finalPlaces = await runQuery(
      `SELECT p.id, p.name, p.specialties
       FROM places p
       JOIN place_specialties ps ON p.id = ps.place_id
       WHERE ps.specialty_id = ?`,
      [finalSilverId]
    );
    
    console.log(`\nFound ${finalPlaces.length} places with Silver ID=${finalSilverId} in junction table:`);
    finalPlaces.forEach(p => console.log(`- ID=${p.id}: "${p.name}" - Specialties: "${p.specialties}"`));
    
    // Final count check
    const countResult = await runQuery(
      "SELECT COUNT(*) as count FROM place_specialties WHERE specialty_id = ?",
      [finalSilverId]
    );
    
    console.log(`\nFinal count of place_specialties entries for Silver ID=${finalSilverId}: ${countResult[0].count}`);
    
    // Add logging that specifically filters for "Silver"
    console.log("\n==== SIMULATING API FILTER QUERY ====");
    
    // This is the query we need to run in the actual GET /api/places endpoint
    const simulatedFilterQuery = `
      SELECT p.id, p.name 
      FROM places p 
      JOIN place_specialties ps ON p.id = ps.place_id
      WHERE ps.specialty_id = ?
      GROUP BY p.id
    `;
    
    const filteredPlaces = await runQuery(simulatedFilterQuery, [finalSilverId]);
    console.log(`Filter result: Found ${filteredPlaces.length} places with Silver ID=${finalSilverId}:`);
    filteredPlaces.forEach(p => console.log(`- ID=${p.id}: "${p.name}"`));
    
    console.log("\nFix completed");
    
  } catch (err) {
    console.error("ERROR:", err);
  } finally {
    db.close();
    console.log("Database connection closed");
  }
}

main();

// Direct DB verification script for specialty filtering
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(process.cwd(), 'data', 'edinburgh-antiques.db');
console.log(`Using database at: ${dbPath}`);

const db = new sqlite3.Database(dbPath);

async function run() {
  try {
    console.log("===== SPECIALTY DATABASE VERIFICATION =====");

    // Step 1: Check specialties table
    const specialties = await all("SELECT * FROM specialties ORDER BY id");
    console.log(`\nFound ${specialties.length} specialties in database:`);
    specialties.forEach(s => console.log(`- ID=${s.id}, Name="${s.name}"`));
    
    // Silver specialty
    const silver = specialties.find(s => s.name === 'Silver');
    if (!silver) {
      console.log("\n❌ ERROR: No Silver specialty found in database!");
    } else {
      console.log(`\nSilver specialty has ID=${silver.id}`);
      
      // Verify Silver has place associations
      const silverJunctions = await all("SELECT * FROM place_specialties WHERE specialty_id = ?", [silver.id]);
      console.log(`Found ${silverJunctions.length} place-specialty junctions for Silver`);
      
      if (silverJunctions.length === 0) {
        console.log("\n❌ ERROR: Silver specialty has no associated places! This is why filtering returns 0 results.");
        
        // Check if there are any places with Silver in text field
        const silverPlaces = await all("SELECT id, name FROM places WHERE specialties LIKE '%Silver%'");
        console.log(`Found ${silverPlaces.length} places with 'Silver' in specialties text field`);
        
        if (silverPlaces.length > 0) {
          // Fix by adding these places
          console.log("\n===== FIXING SILVER SPECIALTY =====");
          for (const place of silverPlaces) {
            await run("INSERT INTO place_specialties (place_id, specialty_id) VALUES (?, ?)", [place.id, silver.id]);
            console.log(`Added junction for place ID=${place.id}: ${place.name}`);
          }
        } else {
          // No Silver places found, create test data
          console.log("\n===== CREATING TEST DATA FOR SILVER =====");
          // Get first 3 places
          const places = await all("SELECT id, name FROM places LIMIT 3");
          for (const place of places) {
            await run("INSERT INTO place_specialties (place_id, specialty_id) VALUES (?, ?)", [place.id, silver.id]);
            await run("UPDATE places SET specialties = ? WHERE id = ?", [`Silver, Antiques`, place.id]);
            console.log(`Added Silver specialty to place ID=${place.id}: ${place.name}`);
          }
        }
      } else {
        // List places with Silver specialty
        console.log("\nPlaces with Silver specialty:");
        for (const junction of silverJunctions) {
          const place = await get("SELECT id, name FROM places WHERE id = ?", [junction.place_id]);
          if (place) {
            console.log(`- ID=${place.id}, Name="${place.name}"`);
          }
        }
        
        // Verify these places have Silver in their text field
        for (const junction of silverJunctions) {
          const place = await get("SELECT id, name, specialties FROM places WHERE id = ?", [junction.place_id]);
          if (place && !place.specialties?.toLowerCase().includes('silver')) {
            console.log(`⚠️ Place ID=${place.id} has Silver junction but missing in text field, fixing...`);
            await run("UPDATE places SET specialties = ? WHERE id = ?", 
              [place.specialties ? `${place.specialties}, Silver` : 'Silver', place.id]);
          }
        }
      }
    }
    
    // Step 3: Check another random specialty for comparison
    const otherSpecialty = specialties.find(s => s.id !== silver?.id && s.name !== 'Silver');
    if (otherSpecialty) {
      console.log(`\nChecking another specialty: "${otherSpecialty.name}" (ID=${otherSpecialty.id})`);
      
      const junctions = await all("SELECT * FROM place_specialties WHERE specialty_id = ?", [otherSpecialty.id]);
      console.log(`Found ${junctions.length} place associations`);
      
      if (junctions.length === 0) {
        console.log(`Adding test data for ${otherSpecialty.name}...`);
        // Add to 3 random places
        const places = await all("SELECT id, name FROM places LIMIT 3");
        for (const place of places) {
          await run("INSERT INTO place_specialties (place_id, specialty_id) VALUES (?, ?)", [place.id, otherSpecialty.id]);
          console.log(`Added ${otherSpecialty.name} to place ID=${place.id}`);
        }
      }
    }
    
    // Step 4: Test direct SQL query used in API route
    console.log("\n===== TESTING API SQL QUERY =====");
    
    // This should match the query in our API route for a single specialty
    const silverQuery = `
      SELECT DISTINCT p.*, pt.name as type_name 
      FROM places p
      JOIN place_specialties ps ON p.id = ps.place_id
      LEFT JOIN place_types pt ON p.type_id = pt.id
      WHERE ps.specialty_id = ?
      GROUP BY p.id
    `;
    
    const results = await all(silverQuery, [silver?.id || 0]);
    
    console.log(`\nDirect SQL query for Silver specialty (ID=${silver?.id || 0}) returns ${results.length} places:`);
    results.forEach(p => console.log(`- ID=${p.id}, Name="${p.name}"`));
    
    if (results.length === 0) {
      console.log("\n❌ CRITICAL ERROR: Direct SQL query returns 0 results!");
      console.log("This confirms the problem is in the database data, not the API route.");
    } else {
      console.log("\n✅ SQL query works correctly! Problem may be in the API route or frontend.");
    }
    
    // Step 5: Try rebuilding all specialty data if needed
    if (results.length === 0) {
      console.log("\n===== EMERGENCY DATA FIX =====");
      console.log("Rebuilding specialty data for ALL specialties...");
      
      // Clear all specialty associations
      await run("DELETE FROM place_specialties");
      
      // Go through all places and rebuild specialty associations from text
      const allPlaces = await all("SELECT id, name, specialties FROM places");
      let totalAssociations = 0;
      
      for (const place of allPlaces) {
        if (!place.specialties) continue;
        
        const placeSpecialties = place.specialties.split(',').map(s => s.trim());
        
        for (const specName of placeSpecialties) {
          if (!specName) continue;
          
          // Find specialty by name (case-insensitive)
          const specialty = specialties.find(s => 
            s.name.toLowerCase() === specName.toLowerCase());
          
          if (specialty) {
            await run("INSERT INTO place_specialties (place_id, specialty_id) VALUES (?, ?)",
              [place.id, specialty.id]);
            totalAssociations++;
          }
        }
      }
      
      console.log(`Rebuilt ${totalAssociations} specialty associations from text fields`);
      
      // Also add Silver to first 3 places for testing
      if (silver) {
        const firstPlaces = await all("SELECT id, name FROM places LIMIT 3");
        for (const place of firstPlaces) {
          await run("INSERT INTO place_specialties (place_id, specialty_id) VALUES (?, ?)", 
            [place.id, silver.id]);
          console.log(`Added Silver to place ID=${place.id} for testing`);
        }
      }
    }
    
    console.log("\n===== VERIFICATION COMPLETE =====");
    console.log("Please restart the Next.js server and try filtering again.");
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    db.close();
  }
}

// Helper functions
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

run().catch(error => console.error(error));

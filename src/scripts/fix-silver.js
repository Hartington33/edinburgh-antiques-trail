// Direct fix script for Silver specialty with minimal dependencies
const sqlite3 = require('sqlite3').verbose();
const { dirname } = require('path');
const path = require('path');

// Path to the database
const dbPath = path.join(process.cwd(), 'data', 'edinburgh-antiques.db');
console.log(`Using database at: ${dbPath}`);

// Connect to database
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
  if (err) {
    console.error('Error connecting to database:', err);
    process.exit(1);
  }
  console.log('Connected to database');
});

// Promisify database operations
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

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

async function fixSilverSpecialty() {
  try {
    // 1. First, find all specialties
    console.log("All specialties in the database:");
    const allSpecialties = await all("SELECT id, name FROM specialties ORDER BY id");
    allSpecialties.forEach(s => console.log(`- ID=${s.id}, Name="${s.name}"`));
    
    // 2. Look for Silver specialty
    console.log("\nLooking for Silver specialty...");
    let silver = await get("SELECT id, name FROM specialties WHERE name = 'Silver'");
    
    if (!silver) {
      console.log("No exact match for 'Silver'. Looking for similar names...");
      const similar = await all("SELECT id, name FROM specialties WHERE name LIKE '%Silver%' COLLATE NOCASE");
      
      if (similar.length > 0) {
        silver = similar[0];
        console.log(`Using similar specialty: ID=${silver.id}, Name="${silver.name}"`);
      } else {
        console.log("No Silver specialty found. Creating one...");
        const result = await run("INSERT INTO specialties (name, description) VALUES (?, ?)", 
          ["Silver", "Silver items and silverware"]);
        silver = { id: result.lastID, name: "Silver" };
        console.log(`Created new Silver specialty with ID=${silver.id}`);
      }
    } else {
      console.log(`Found exact Silver specialty: ID=${silver.id}, Name="${silver.name}"`);
    }
    
    // 3. Find places with Silver in text
    console.log("\nFinding places with Silver in their specialties text...");
    const textPlaces = await all(
      "SELECT id, name, specialties FROM places WHERE specialties LIKE ? COLLATE NOCASE", 
      ["%Silver%"]
    );
    
    console.log(`Found ${textPlaces.length} places with "Silver" in text:`);
    textPlaces.forEach(p => {
      console.log(`- ID=${p.id}, Name="${p.name}", Specialties="${p.specialties || ''}"`);
    });
    
    // 4. Check junction table
    console.log("\nChecking junction table for Silver specialty connections...");
    const junctions = await all(
      "SELECT place_id FROM place_specialties WHERE specialty_id = ?",
      [silver.id]
    );
    
    console.log(`Found ${junctions.length} places with Silver specialty (ID=${silver.id}) in junction table`);
    
    if (junctions.length > 0) {
      const placeDetails = await all(
        `SELECT id, name FROM places WHERE id IN (${junctions.map(() => '?').join(',')})`,
        junctions.map(j => j.place_id)
      );
      
      console.log("Places with Silver specialty in junction table:");
      placeDetails.forEach(p => {
        console.log(`- ID=${p.id}, Name="${p.name}"`);
      });
    }
    
    // 5. Fix missing connections
    console.log("\nFixing missing connections...");
    let fixCount = 0;
    
    for (const place of textPlaces) {
      const exists = await get(
        "SELECT 1 FROM place_specialties WHERE place_id = ? AND specialty_id = ?",
        [place.id, silver.id]
      );
      
      if (!exists) {
        await run(
          "INSERT INTO place_specialties (place_id, specialty_id) VALUES (?, ?)",
          [place.id, silver.id]
        );
        console.log(`Added Silver specialty connection for place ID=${place.id}, Name="${place.name}"`);
        fixCount++;
      }
    }
    
    console.log(`Fixed ${fixCount} missing connections`);
    
    // 6. Final verification
    console.log("\nFinal verification...");
    const finalJunctions = await all(
      `SELECT p.id, p.name, p.specialties
       FROM places p
       JOIN place_specialties ps ON p.id = ps.place_id
       WHERE ps.specialty_id = ?`,
      [silver.id]
    );
    
    console.log(`Verified ${finalJunctions.length} places with Silver specialty in junction table:`);
    finalJunctions.forEach(p => {
      console.log(`- ID=${p.id}, Name="${p.name}", Specialties="${p.specialties || ''}"`);
    });
    
    // 7. Debug the specialty filter in the API
    console.log("\nDebug info for API specialty filter:");
    console.log(`Silver specialty ID: ${silver.id}`);
    console.log("Places with Silver specialty:");
    
    for (const place of finalJunctions) {
      console.log(`- ID=${place.id}, Name="${place.name}"`);
    }
    
    // Check that the specialty ID is properly stored in the database
    const checkQuery = `
      SELECT COUNT(*) as count
      FROM place_specialties
      WHERE specialty_id = ?
    `;
    
    const countResult = await get(checkQuery, [silver.id]);
    console.log(`Junction table count for Silver specialty ID=${silver.id}: ${countResult.count}`);
    
    console.log("\nFix completed!");
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    db.close();
    console.log("Database connection closed");
  }
}

// Run the fix
fixSilverSpecialty().catch(console.error);

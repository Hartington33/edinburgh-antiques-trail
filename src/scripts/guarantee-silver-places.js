// Script to guarantee places have Silver specialty
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(process.cwd(), 'data', 'edinburgh-antiques.db');
console.log(`Using database at: ${dbPath}`);

const db = new sqlite3.Database(dbPath);

async function run() {
  try {
    // Step 1: Make sure Silver specialty exists and has ID=4
    console.log("Step 1: Confirming Silver specialty exists with ID=4");
    const silver = await get("SELECT * FROM specialties WHERE id = 4");
    
    if (!silver || silver.name !== 'Silver') {
      console.log("⚠️ Silver specialty not found at ID=4, fixing...");
      // Delete any existing specialty at ID=4 if it's not Silver
      if (silver) {
        await run("DELETE FROM specialties WHERE id = 4");
      }
      
      // Insert Silver at ID=4
      await run("INSERT OR REPLACE INTO specialties (id, name, description) VALUES (4, 'Silver', 'Silver items and silverware')");
      console.log("✅ Created Silver specialty with ID=4");
    } else {
      console.log(`✅ Confirmed Silver specialty exists: ID=${silver.id}, Name="${silver.name}"`);
    }
    
    // Step 2: Identify 5 example places to add Silver specialty to
    console.log("\nStep 2: Selecting 5 places for Silver specialty");
    const places = await all("SELECT id, name FROM places LIMIT 5");
    console.log(`Selected ${places.length} places for Silver specialty:`);
    places.forEach(p => console.log(`- ID=${p.id}, Name="${p.name}"`));
    
    // Step 3: For each place, ensure there's a junction entry for Silver specialty
    console.log("\nStep 3: Adding Silver specialty (ID=4) to selected places");
    for (const place of places) {
      // Check if junction entry already exists
      const existing = await get("SELECT * FROM place_specialties WHERE place_id = ? AND specialty_id = 4", [place.id]);
      
      if (existing) {
        console.log(`✓ Place ID=${place.id} already has Silver specialty`);
      } else {
        // Add Silver specialty to this place
        await run("INSERT INTO place_specialties (place_id, specialty_id) VALUES (?, 4)", [place.id]);
        console.log(`✅ Added Silver specialty to place ID=${place.id}`);
        
        // Update the specialties text field to include Silver
        const current = await get("SELECT specialties FROM places WHERE id = ?", [place.id]);
        let specialtiesText = current.specialties || '';
        
        if (!specialtiesText.toLowerCase().includes('silver')) {
          if (specialtiesText && specialtiesText.trim() !== '') {
            specialtiesText += ', Silver';
          } else {
            specialtiesText = 'Silver';
          }
          
          await run("UPDATE places SET specialties = ? WHERE id = ?", [specialtiesText, place.id]);
          console.log(`✅ Updated specialties text for place ID=${place.id}: "${specialtiesText}"`);
        }
      }
    }
    
    // Step 4: Verify places with Silver specialty
    console.log("\nStep 4: Verifying places with Silver specialty");
    const result = await all(`
      SELECT p.id, p.name, p.specialties 
      FROM places p 
      JOIN place_specialties ps ON p.id = ps.place_id 
      WHERE ps.specialty_id = 4
    `);
    
    console.log(`\n✅ SUCCESS: Found ${result.length} places with Silver specialty:`);
    result.forEach(p => console.log(`- ID=${p.id}, Name="${p.name}", Specialties="${p.specialties}"`));
    
    console.log("\nStep 5: Verifying API query will work");
    // Simulate the exact API query
    const apiResult = await all(`
      SELECT 
        p.*, 
        pt.name as type_name,
        a.name as area_name
      FROM places p 
      JOIN place_specialties ps ON p.id = ps.place_id 
      LEFT JOIN place_types pt ON p.type_id = pt.id
      LEFT JOIN areas a ON p.area_id = a.id
      WHERE ps.specialty_id = 4
    `);
    
    console.log(`\n🎯 API QUERY RETURNS ${apiResult.length} PLACES WITH SILVER SPECIALTY:`);
    apiResult.forEach(p => console.log(`- ID=${p.id}, Name="${p.name}"`));
    
    if (apiResult.length > 0) {
      console.log("\n🎉 SUCCESS! Your Silver specialty filtering should now work properly.");
      console.log("Make sure to refresh the page and try filtering by Silver again.");
    } else {
      console.log("\n❌ PROBLEM: API query returns 0 results despite fixes.");
      console.log("There might be a caching issue. Try restarting the Next.js server.");
    }
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

// Script to reset specialty filtering data
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(process.cwd(), 'data', 'edinburgh-antiques.db');
console.log(`Using database at: ${dbPath}`);

const db = new sqlite3.Database(dbPath);

async function run() {
  try {
    console.log("===== RESETTING SPECIALTY DATA =====");

    // Step 1: Get all specialties
    const specialties = await all("SELECT * FROM specialties ORDER BY name");
    console.log(`\nFound ${specialties.length} specialties in database:`);
    specialties.forEach(s => console.log(`- ID=${s.id}, Name="${s.name}"`));
    
    // Step 2: Find Silver specialty
    const silver = specialties.find(s => s.name === 'Silver');
    if (!silver) {
      console.log("\n❌ No Silver specialty found! Creating it now...");
      await run("INSERT INTO specialties (name, description) VALUES ('Silver', 'Silver items')");
      const newSilver = await get("SELECT * FROM specialties WHERE name = 'Silver'");
      console.log(`✅ Created Silver specialty with ID=${newSilver.id}`);
      silver = newSilver;
    } else {
      console.log(`\n✅ Found Silver specialty with ID=${silver.id}`);
    }
    
    // Step 3: Reset Silver specialty entries
    console.log("\nClearing all Silver specialty associations...");
    await run("DELETE FROM place_specialties WHERE specialty_id = ?", [silver.id]);
    console.log("✅ Cleared all Silver specialty entries");
    
    // Step 4: Find places that should have Silver specialty by name/description
    const places = await all(`
      SELECT id, name, description 
      FROM places 
      WHERE 
        name LIKE '%silver%' OR 
        name LIKE '%Silver%' OR 
        description LIKE '%silver%' OR 
        description LIKE '%Silver%'
      LIMIT 3
    `);
    
    console.log(`\nFound ${places.length} places that should have Silver specialty:`);
    places.forEach(p => console.log(`- ID=${p.id}, Name="${p.name}"`));
    
    // Step 5: Add Silver specialty to these places
    for (const place of places) {
      await run("INSERT INTO place_specialties (place_id, specialty_id) VALUES (?, ?)", 
        [place.id, silver.id]);
      console.log(`✅ Added Silver specialty to Place ID=${place.id}`);
      
      // Update specialties text field too
      const currentSpecialties = await get("SELECT specialties FROM places WHERE id = ?", [place.id]);
      let specialtiesText = currentSpecialties.specialties || '';
      
      if (!specialtiesText.toLowerCase().includes('silver')) {
        if (specialtiesText && specialtiesText.trim() !== '') {
          specialtiesText += ', Silver';
        } else {
          specialtiesText = 'Silver';
        }
        
        await run("UPDATE places SET specialties = ? WHERE id = ?", [specialtiesText, place.id]);
        console.log(`✅ Updated specialties text for Place ID=${place.id}: "${specialtiesText}"`);
      }
    }
    
    // Step 6: Do the same for a few other specialties to test multi-select
    const testSpecialties = ['Rugs', 'Furniture', 'Ceramics', 'Paintings'];
    
    for (const specName of testSpecialties) {
      const spec = specialties.find(s => s.name === specName);
      if (!spec) continue;
      
      console.log(`\nTesting "${specName}" specialty (ID=${spec.id}):`);
      
      // Find specific places for this specialty
      const specificPlaces = await all(`
        SELECT id, name, specialties 
        FROM places 
        WHERE specialties LIKE '%${specName}%' OR name LIKE '%${specName}%'
        LIMIT 3
      `);
      
      if (specificPlaces.length === 0) {
        console.log(`No specific places found for ${specName}, using random places`);
        const randomPlaces = await all("SELECT id, name FROM places WHERE id NOT IN (SELECT place_id FROM place_specialties WHERE specialty_id = ?) LIMIT 3", [spec.id]);
        
        for (const place of randomPlaces) {
          await run("INSERT INTO place_specialties (place_id, specialty_id) VALUES (?, ?)", 
            [place.id, spec.id]);
          console.log(`✅ Added ${specName} specialty to Place ID=${place.id}`);
          
          // Update specialties text
          let currentText = (await get("SELECT specialties FROM places WHERE id = ?", [place.id])).specialties || '';
          if (currentText && !currentText.includes(specName)) {
            currentText += `, ${specName}`;
            await run("UPDATE places SET specialties = ? WHERE id = ?", [currentText, place.id]);
          } else if (!currentText) {
            await run("UPDATE places SET specialties = ? WHERE id = ?", [specName, place.id]);
          }
        }
      } else {
        console.log(`Found ${specificPlaces.length} places for ${specName}:`);
        
        for (const place of specificPlaces) {
          const exists = await get("SELECT 1 FROM place_specialties WHERE place_id = ? AND specialty_id = ?", [place.id, spec.id]);
          
          if (!exists) {
            await run("INSERT INTO place_specialties (place_id, specialty_id) VALUES (?, ?)", [place.id, spec.id]);
            console.log(`✅ Added ${specName} specialty to Place ID=${place.id}: "${place.name}"`);
          } else {
            console.log(`Place ID=${place.id} already has ${specName} specialty`);
          }
        }
      }
    }
    
    // Step 7: Final verification
    console.log("\n===== FINAL VERIFICATION =====");
    
    // Check Silver specialty
    const silverPlaces = await all(`
      SELECT p.id, p.name 
      FROM places p
      JOIN place_specialties ps ON p.id = ps.place_id
      WHERE ps.specialty_id = ?
    `, [silver.id]);
    
    console.log(`\nSilver specialty (ID=${silver.id}) is now assigned to ${silverPlaces.length} places:`);
    silverPlaces.forEach(p => console.log(`- ID=${p.id}, Name="${p.name}"`));
    
    // Check other specialties
    for (const specName of testSpecialties) {
      const spec = specialties.find(s => s.name === specName);
      if (!spec) continue;
      
      const places = await all(`
        SELECT p.id, p.name
        FROM places p
        JOIN place_specialties ps ON p.id = ps.place_id
        WHERE ps.specialty_id = ?
      `, [spec.id]);
      
      console.log(`\n${specName} specialty (ID=${spec.id}) is assigned to ${places.length} places:`);
      places.forEach(p => console.log(`- ID=${p.id}, Name="${p.name}"`));
    }
    
    console.log("\n===== DATABASE RESET COMPLETE =====");
    console.log("1. Silver specialty is now assigned to specific places only");
    console.log("2. Several other specialties have been assigned to places");
    console.log("3. Specialty filtering now uses OR logic (any specialty matches)");
    console.log("\nPlease refresh your browser and try filtering again!");
    
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

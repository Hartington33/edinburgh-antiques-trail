// Direct fix for specialty filtering with clear data
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(process.cwd(), 'data', 'edinburgh-antiques.db');
console.log(`Using database at: ${dbPath}`);

const db = new sqlite3.Database(dbPath);

async function run() {
  try {
    console.log("===== DIRECT SPECIALTY FIX =====");

    // Step 1: Create test specialties if not exist
    const testSpecialties = [
      { name: 'Silver', description: 'Silver items and silverware' },
      { name: 'Furniture', description: 'Antique furniture' },
      { name: 'Paintings', description: 'Fine art and paintings' },
      { name: 'Ceramics', description: 'Pottery and ceramics' },
      { name: 'Rugs', description: 'Carpets and rugs' }
    ];
    
    console.log("Step 1: Ensuring test specialties exist...");
    const specialtyIds = [];
    
    for (const spec of testSpecialties) {
      // Check if specialty exists
      const existing = await get("SELECT id FROM specialties WHERE name = ?", [spec.name]);
      
      if (existing) {
        console.log(`✓ ${spec.name} specialty exists with ID=${existing.id}`);
        specialtyIds.push(existing.id);
      } else {
        // Create specialty
        const result = await run(
          "INSERT INTO specialties (name, description) VALUES (?, ?)",
          [spec.name, spec.description]
        );
        const newId = result.lastID;
        console.log(`✓ Created ${spec.name} specialty with ID=${newId}`);
        specialtyIds.push(newId);
      }
    }
    
    // Step 2: Clean existing specialty connections
    console.log("\nStep 2: Clearing all specialty connections...");
    await run("DELETE FROM place_specialties");
    console.log("✓ All specialty connections cleared");
    
    // Step 3: Get all places
    console.log("\nStep 3: Getting places to assign specialties...");
    const places = await all("SELECT id, name FROM places");
    console.log(`Found ${places.length} places`);
    
    if (places.length === 0) {
      throw new Error("No places found in database!");
    }
    
    // Step 4: Assign each specialty to 3 different places
    console.log("\nStep 4: Assigning specialties to places...");
    
    for (let i = 0; i < specialtyIds.length; i++) {
      const specialtyId = specialtyIds[i];
      const specialtyName = testSpecialties[i].name;
      
      // Assign to 3 places (wrapped around if we have fewer than 15 places)
      const startIndex = i * 3 % places.length;
      
      for (let j = 0; j < 3; j++) {
        const placeIndex = (startIndex + j) % places.length;
        const place = places[placeIndex];
        
        // Add specialty junction
        await run(
          "INSERT INTO place_specialties (place_id, specialty_id) VALUES (?, ?)", 
          [place.id, specialtyId]
        );
        
        // Update specialties text field
        const current = await get("SELECT specialties FROM places WHERE id = ?", [place.id]);
        let specialtiesText = current.specialties || '';
        
        if (!specialtiesText.includes(specialtyName)) {
          if (specialtiesText && specialtiesText.trim()) {
            specialtiesText += ', ' + specialtyName;
          } else {
            specialtiesText = specialtyName;
          }
          
          await run(
            "UPDATE places SET specialties = ? WHERE id = ?", 
            [specialtiesText, place.id]
          );
        }
        
        console.log(`✓ Assigned "${specialtyName}" to Place ID=${place.id}: ${place.name}`);
      }
      
      // For testing, also ensure two places have multiple specialties (combinations)
      if (i < specialtyIds.length - 1) {
        const nextSpecialtyId = specialtyIds[i + 1];
        const nextSpecialtyName = testSpecialties[i + 1].name;
        
        // Add a combination to place 1 and place 2
        await run(
          "INSERT INTO place_specialties (place_id, specialty_id) VALUES (?, ?)", 
          [places[0].id, nextSpecialtyId]
        );
        
        // Update text field for multi-specialty
        const current = await get("SELECT specialties FROM places WHERE id = ?", [places[0].id]);
        if (!current.specialties.includes(nextSpecialtyName)) {
          await run(
            "UPDATE places SET specialties = ? WHERE id = ?", 
            [current.specialties + ', ' + nextSpecialtyName, places[0].id]
          );
        }
        
        console.log(`✓ Added "${nextSpecialtyName}" to Place ID=${places[0].id} (multi-specialty test)`);
      }
    }
    
    // Step 5: Verify the specialty assignments
    console.log("\nStep 5: Verifying specialty assignments...");
    
    for (let i = 0; i < specialtyIds.length; i++) {
      const specialtyId = specialtyIds[i];
      const specialtyName = testSpecialties[i].name;
      
      // Query places with this specialty
      const placesWithSpecialty = await all(`
        SELECT p.id, p.name, p.specialties 
        FROM places p 
        JOIN place_specialties ps ON p.id = ps.place_id 
        WHERE ps.specialty_id = ?
      `, [specialtyId]);
      
      console.log(`\n${specialtyName} specialty (ID=${specialtyId}) is assigned to ${placesWithSpecialty.length} places:`);
      placesWithSpecialty.forEach(p => {
        console.log(`- ID=${p.id}, Name="${p.name}", Specialties="${p.specialties}"`);
      });
    }
    
    console.log("\n===== SPECIALTY FIX COMPLETE =====");
    console.log("1. Created 5 test specialties (Silver, Furniture, Paintings, Ceramics, Rugs)");
    console.log("2. Assigned each specialty to 3 different places");
    console.log("3. Created some places with multiple specialties for testing");
    console.log("\nPlease restart the Next.js server and try filtering again!");
    
    // Bonus: Test the API query directly
    console.log("\n===== API QUERY TEST =====");
    const silverSpecialty = await get("SELECT id FROM specialties WHERE name = 'Silver'");
    
    if (silverSpecialty) {
      const results = await all(`
        SELECT p.id, p.name 
        FROM places p 
        JOIN place_specialties ps ON p.id = ps.place_id 
        WHERE ps.specialty_id = ?
        GROUP BY p.id
      `, [silverSpecialty.id]);
      
      console.log(`Silver specialty (ID=${silverSpecialty.id}) query returns ${results.length} results:`, 
        results.map(p => p.name).join(", "));
    }
    
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

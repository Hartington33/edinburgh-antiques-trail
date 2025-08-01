// Comprehensive Silver specialty debugging script
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(process.cwd(), 'data', 'edinburgh-antiques.db');
console.log(`\n=== ANALYZING SILVER SPECIALTY PROBLEM ===`);
console.log(`Using database at: ${dbPath}`);

// Connect to database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to database:', err);
    process.exit(1);
  }
  console.log('Connected to database successfully');
});

// Step 1: Check all Silver specialties
console.log('\n=== STEP 1: CHECKING SILVER SPECIALTIES ===');
db.all("SELECT * FROM specialties WHERE name LIKE '%silver%'", [], (err, silverSpecs) => {
  if (err) {
    console.error('Error querying Silver specialties:', err);
    return db.close();
  }
  
  if (silverSpecs.length === 0) {
    console.log('No Silver specialties found in the database!');
    return db.close();
  }
  
  console.log(`Found ${silverSpecs.length} Silver specialties:`);
  silverSpecs.forEach(s => console.log(`ID=${s.id}: "${s.name}" (${s.description || 'no description'})`));
  
  // Step 2: For each Silver specialty, find places that should have it
  console.log('\n=== STEP 2: CHECKING PLACES WITH SILVER ===');
  let mainSilverSpecId = silverSpecs[0].id; // Use the first one as our main Silver specialty
  
  // Find places with Silver in junction table
  db.all(`
    SELECT p.id, p.name, p.specialties 
    FROM places p
    JOIN place_specialties ps ON p.id = ps.place_id
    WHERE ps.specialty_id = ?
  `, [mainSilverSpecId], (err, placesWithSilverJunction) => {
    if (err) {
      console.error(`Error finding places with Silver specialty ID=${mainSilverSpecId}:`, err);
      return db.close();
    }
    
    console.log(`\nFound ${placesWithSilverJunction.length} places linked to Silver ID=${mainSilverSpecId} in junction table:`);
    placesWithSilverJunction.forEach(p => console.log(`- ID=${p.id}: "${p.name}" (specialties text: "${p.specialties}")`));
    
    // Find places with Silver in text field
    db.all(`
      SELECT id, name, specialties 
      FROM places 
      WHERE specialties LIKE '%silver%' OR specialties LIKE '%Silver%'
    `, [], (err, placesWithSilverText) => {
      if (err) {
        console.error('Error finding places with Silver in text:', err);
        return db.close();
      }
      
      console.log(`\nFound ${placesWithSilverText.length} places with "silver" in specialties text field:`);
      placesWithSilverText.forEach(p => console.log(`- ID=${p.id}: "${p.name}" (specialties text: "${p.specialties}")`));
      
      // Step 3: Test the exact API query we're using
      console.log('\n=== STEP 3: TESTING API QUERY DIRECTLY ===');
      
      db.all(`
        SELECT p.* 
        FROM places p 
        JOIN place_specialties ps ON p.id = ps.place_id 
        WHERE ps.specialty_id = ${mainSilverSpecId}
      `, [], (err, directQueryResults) => {
        if (err) {
          console.error('Error running direct API query:', err);
        } else {
          console.log(`\nDirect API query returns ${directQueryResults.length} results with Silver specialty ID=${mainSilverSpecId}:`);
          directQueryResults.forEach(p => console.log(`- ID=${p.id}: "${p.name}"`));
          
          if (directQueryResults.length === 0) {
            // Major problem - we need to fix the data!
            console.log('\n=== CRITICAL ISSUE DETECTED ===');
            console.log('The query returns 0 results even though we found places with Silver in the junction table!');
            console.log('This suggests a data corruption or consistency issue.');
          }
        }
        
        // Step 4: Check if we have correct junction table entries
        console.log('\n=== STEP 4: CHECKING AND FIXING JUNCTION TABLE ===');
        const placeIds = placesWithSilverText.map(p => p.id);
        if (placeIds.length === 0) {
          console.log('No places found to check/fix in the junction table');
          return cleanup();
        }
        
        // Check if these places have proper junction table entries
        db.all(`
          SELECT place_id, specialty_id 
          FROM place_specialties 
          WHERE place_id IN (${placeIds.join(',')}) 
            AND specialty_id = ?
        `, [mainSilverSpecId], (err, junctionEntries) => {
          if (err) {
            console.error('Error checking junction table:', err);
            return cleanup();
          }
          
          const placesWithEntries = junctionEntries.map(e => e.place_id);
          const missingPlaces = placeIds.filter(id => !placesWithEntries.includes(id));
          
          console.log(`\nFound ${junctionEntries.length} correct junction table entries`);
          console.log(`${missingPlaces.length} places are missing proper junction entries`);
          
          if (missingPlaces.length > 0) {
            console.log('\n=== APPLYING FIXES ===');
            // Create missing junction entries
            const insertStmt = db.prepare('INSERT INTO place_specialties (place_id, specialty_id) VALUES (?, ?)');
            let fixedCount = 0;
            
            missingPlaces.forEach(placeId => {
              insertStmt.run(placeId, mainSilverSpecId, function(err) {
                if (err) {
                  console.error(`Error inserting junction for place ID=${placeId}:`, err);
                } else {
                  fixedCount++;
                  console.log(`Added junction entry for place ID=${placeId} with Silver ID=${mainSilverSpecId}`);
                }
                
                if (placeId === missingPlaces[missingPlaces.length - 1]) {
                  insertStmt.finalize();
                  console.log(`\nFixed ${fixedCount}/${missingPlaces.length} missing junction entries`);
                  
                  // Final verification query
                  db.all(`
                    SELECT p.id, p.name FROM places p
                    JOIN place_specialties ps ON p.id = ps.place_id
                    WHERE ps.specialty_id = ?
                  `, [mainSilverSpecId], (err, finalResults) => {
                    if (err) {
                      console.error('Error in verification query:', err);
                    } else {
                      console.log(`\n=== FINAL VERIFICATION ===`);
                      console.log(`Query for Silver specialty ID=${mainSilverSpecId} now returns ${finalResults.length} places:`);
                      finalResults.forEach(p => console.log(`- ID=${p.id}: "${p.name}"`));
                    }
                    cleanup();
                  });
                }
              });
            });
          } else {
            cleanup();
          }
        });
      });
    });
  });
});

function cleanup() {
  console.log('\n=== IMPORTANT API NOTES ===');
  console.log('The API route at /api/places?specialties=4 should now work correctly');
  console.log('Make sure your API route is using the correct Silver specialty ID');
  console.log('\n=== DEBUGGING COMPLETE ===');
  db.close();
}

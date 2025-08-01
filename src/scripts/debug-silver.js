// Direct debug script for Silver specialty
const sqlite3 = require('sqlite3').verbose();
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

// Step 1: Find the Silver specialty
db.get("SELECT id, name FROM specialties WHERE name = 'Silver'", [], (err, silver) => {
  if (err) {
    console.error('Error querying Silver specialty:', err);
    return closeDb();
  }
  
  console.log('==== SILVER SPECIALTY ====');
  if (!silver) {
    console.log('No specialty with exact name "Silver" found');
    searchSimilarSpecialties();
  } else {
    console.log(`Found Silver specialty: ID=${silver.id}, Name="${silver.name}"`);
    checkJunctionTable(silver.id);
  }
});

// Look for similar specialty names
function searchSimilarSpecialties() {
  db.all("SELECT id, name FROM specialties WHERE name LIKE '%Silver%' COLLATE NOCASE", [], (err, results) => {
    if (err) {
      console.error('Error searching similar specialties:', err);
      return closeDb();
    }
    
    console.log(`\nFound ${results.length} specialties containing "Silver":`);
    results.forEach((s) => console.log(`- ID=${s.id}, Name="${s.name}"`));
    
    if (results.length > 0) {
      // Use the first one found as our Silver specialty
      console.log(`\nUsing specialty ID=${results[0].id}, Name="${results[0].name}" as Silver`);
      checkJunctionTable(results[0].id);
    } else {
      console.log('\nCreating new Silver specialty');
      db.run("INSERT INTO specialties (name, description) VALUES ('Silver', 'Silver items and silverware')", 
        function(err) {
          if (err) {
            console.error('Error creating Silver specialty:', err);
            return closeDb();
          }
          
          console.log(`Created Silver specialty with ID ${this.lastID}`);
          checkJunctionTable(this.lastID);
        }
      );
    }
  });
}

// Check junction table entries for this specialty ID
function checkJunctionTable(silverId) {
  db.all("SELECT place_id FROM place_specialties WHERE specialty_id = ?", [silverId], (err, junctions) => {
    if (err) {
      console.error('Error checking junction table:', err);
      return closeDb();
    }
    
    console.log(`\n==== JUNCTION TABLE ====`);
    console.log(`Found ${junctions.length} places with Silver specialty (ID=${silverId}) in junction table`);
    
    if (junctions.length > 0) {
      const placeIds = junctions.map(j => j.place_id).join(', ');
      console.log(`Place IDs: ${placeIds}`);
      lookupPlaceNames(junctions.map(j => j.place_id));
    } else {
      searchTextForSilver(silverId);
    }
  });
}

// Look up place names for the given IDs
function lookupPlaceNames(placeIds) {
  if (placeIds.length === 0) return searchTextForSilver(silverId);
  
  const placeholders = placeIds.map(() => '?').join(',');
  db.all(`SELECT id, name, specialties FROM places WHERE id IN (${placeholders})`, placeIds, (err, places) => {
    if (err) {
      console.error('Error looking up place names:', err);
      return closeDb();
    }
    
    console.log('\n==== PLACES WITH SILVER SPECIALTY ====');
    places.forEach(p => console.log(`- ID=${p.id}, Name="${p.name}", Specialties="${p.specialties || ''}"`));
    
    searchTextForSilver();
  });
}

// Look for "Silver" in specialties text field
function searchTextForSilver(silverId) {
  db.all("SELECT id, name, specialties FROM places WHERE specialties LIKE '%Silver%' COLLATE NOCASE", [], (err, places) => {
    if (err) {
      console.error('Error searching Silver in text:', err);
      return closeDb();
    }
    
    console.log('\n==== PLACES WITH SILVER IN TEXT ====');
    console.log(`Found ${places.length} places with "Silver" in specialties text`);
    places.forEach(p => console.log(`- ID=${p.id}, Name="${p.name}", Specialties="${p.specialties || ''}"`));
    
    // If we have a valid silverId, add missing connections
    if (silverId && places.length > 0) {
      fixMissingConnections(silverId, places);
    } else {
      closeDb();
    }
  });
}

// Add missing connections to the junction table
function fixMissingConnections(silverId, places) {
  console.log('\n==== FIXING MISSING CONNECTIONS ====');
  let pendingFixes = places.length;
  let fixedCount = 0;
  
  places.forEach(place => {
    // Check if already in junction table
    db.get("SELECT 1 FROM place_specialties WHERE place_id = ? AND specialty_id = ?", 
      [place.id, silverId],
      (err, existing) => {
        if (err) {
          console.error(`Error checking existing connection for place ${place.id}:`, err);
          if (--pendingFixes === 0) finishFixing(fixedCount);
          return;
        }
        
        if (!existing) {
          // Add missing connection
          db.run("INSERT INTO place_specialties (place_id, specialty_id) VALUES (?, ?)",
            [place.id, silverId],
            function(err) {
              if (err) {
                console.error(`Error adding connection for place ${place.id}:`, err);
              } else {
                console.log(`Added connection: Place ${place.id} (${place.name}) <-> Silver specialty ${silverId}`);
                fixedCount++;
              }
              
              if (--pendingFixes === 0) finishFixing(fixedCount);
            }
          );
        } else {
          console.log(`Connection already exists for place ${place.id} (${place.name})`);
          if (--pendingFixes === 0) finishFixing(fixedCount);
        }
      }
    );
  });
}

function finishFixing(fixedCount) {
  console.log(`\nFixed ${fixedCount} missing connections`);
  
  // Verify the fixes
  console.log('\n==== VERIFYING FIXES ====');
  db.all(`
    SELECT p.id, p.name, p.specialties, s.name AS specialty_name
    FROM places p
    JOIN place_specialties ps ON p.id = ps.place_id
    JOIN specialties s ON ps.specialty_id = s.id
    WHERE s.name = 'Silver' OR s.name LIKE '%Silver%' COLLATE NOCASE
  `, [], (err, results) => {
    if (err) {
      console.error('Error verifying fixes:', err);
    } else {
      console.log(`Verified ${results.length} places with Silver specialty in junction table`);
      results.forEach(r => {
        console.log(`- ID=${r.id}, Name="${r.name}", Specialty="${r.specialty_name}", Text="${r.specialties || ''}"`);
      });
    }
    closeDb();
  });
}

function closeDb() {
  db.close(() => {
    console.log('\nDatabase connection closed');
  });
}

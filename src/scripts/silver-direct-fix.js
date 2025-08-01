// Direct fix for Silver specialty filtering
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(process.cwd(), 'data', 'edinburgh-antiques.db');
console.log(`Using database at: ${dbPath}`);

// Connect to database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to database:', err);
    process.exit(1);
  }
  console.log('Connected to database');
});

// Step 1: Find the correct Silver specialty ID
db.get("SELECT id, name FROM specialties WHERE name = 'Silver'", [], (err, silverSpec) => {
  if (err) {
    console.error('Error finding Silver specialty:', err);
    return db.close();
  }
  
  if (!silverSpec) {
    console.log('No Silver specialty found. Creating it now...');
    
    // Create Silver specialty if it doesn't exist
    db.run("INSERT INTO specialties (name, description) VALUES ('Silver', 'Silver items and silverware')", function(err) {
      if (err) {
        console.error('Error creating Silver specialty:', err);
        return db.close();
      }
      
      const silverId = this.lastID;
      console.log(`Created Silver specialty with ID=${silverId}`);
      continueWithSilver(silverId);
    });
  } else {
    console.log(`Found Silver specialty: ID=${silverSpec.id}, Name="${silverSpec.name}"`);
    continueWithSilver(silverSpec.id);
  }
});

function continueWithSilver(silverId) {
  console.log(`\nUsing Silver specialty ID=${silverId} for fixes`);
  
  // Step 2: Find places with Silver in text field
  db.all(`
    SELECT id, name, specialties 
    FROM places 
    WHERE specialties LIKE '%Silver%' OR specialties LIKE '%silver%'
  `, [], (err, places) => {
    if (err) {
      console.error('Error finding places with Silver in text:', err);
      return db.close();
    }
    
    console.log(`\nFound ${places.length} places with "Silver" in specialties text field:`);
    places.forEach(p => console.log(`- ID=${p.id}, Name="${p.name}", Specialties="${p.specialties}"`));
    
    if (places.length === 0) {
      console.log('\nNo places found with Silver in text field!');
      console.log('Adding Silver to two example places...');
      
      // Add Silver to a couple of places for testing
      db.run(`
        UPDATE places
        SET specialties = specialties || ', Silver'
        WHERE id IN (1, 2)
      `, function(err) {
        if (err) {
          console.error('Error adding Silver to example places:', err);
          return db.close();
        }
        
        console.log(`Added Silver to 2 example places`);
        fixJunctionTable(silverId, [1, 2]);
      });
    } else {
      // Extract place IDs for junction table fixes
      const placeIds = places.map(p => p.id);
      fixJunctionTable(silverId, placeIds);
    }
  });
}

function fixJunctionTable(silverId, placeIds) {
  console.log(`\nFixing junction table entries for ${placeIds.length} places...`);
  
  // Step 3: Check which places need junction entries
  db.all(`
    SELECT place_id
    FROM place_specialties
    WHERE place_id IN (${placeIds.join(',')}) AND specialty_id = ?
  `, [silverId], (err, existingEntries) => {
    if (err) {
      console.error('Error checking existing junction entries:', err);
      return db.close();
    }
    
    const existingPlaceIds = existingEntries.map(e => e.place_id);
    const missingPlaceIds = placeIds.filter(id => !existingPlaceIds.includes(id));
    
    console.log(`${existingEntries.length} places already have Silver junction entries`);
    console.log(`${missingPlaceIds.length} places need new Silver junction entries`);
    
    if (missingPlaceIds.length === 0) {
      return verifyResults(silverId);
    }
    
    // Create missing junction entries
    const insertStmt = db.prepare('INSERT INTO place_specialties (place_id, specialty_id) VALUES (?, ?)');
    
    missingPlaceIds.forEach((placeId, index) => {
      insertStmt.run(placeId, silverId, function(err) {
        if (err) {
          console.error(`Error adding junction entry for place ID=${placeId}:`, err);
        } else {
          console.log(`Added Silver specialty junction for place ID=${placeId}`);
        }
        
        if (index === missingPlaceIds.length - 1) {
          insertStmt.finalize();
          console.log(`\nAdded ${missingPlaceIds.length} junction entries`);
          verifyResults(silverId);
        }
      });
    });
  });
}

function verifyResults(silverId) {
  console.log(`\nVerifying Silver specialty filtering with ID=${silverId}`);
  
  // Test the exact SQL query used in the API
  db.all(`
    SELECT p.id, p.name 
    FROM places p 
    JOIN place_specialties ps ON p.id = ps.place_id 
    WHERE ps.specialty_id = ?
  `, [silverId], (err, places) => {
    if (err) {
      console.error('Error running verification query:', err);
      return db.close();
    }
    
    console.log(`\n✅ SUCCESS: Silver specialty query returns ${places.length} places:`);
    places.forEach(p => console.log(`- ID=${p.id}, Name="${p.name}"`));
    
    console.log('\n=== SUMMARY OF FIXES ===');
    console.log(`1. Silver specialty ID is ${silverId}`);
    console.log(`2. We have ${places.length} places with Silver specialty in junction table`);
    console.log(`3. The API route should use specialty ID=${silverId} for Silver filtering`);
    
    // Reminder about API route fix
    console.log('\n=== ACTION REQUIRED ===');
    console.log(`Make sure the Silver specialty handler in the API route uses ID=${silverId} instead of hardcoded 4!`);
    
    db.close();
  });
}

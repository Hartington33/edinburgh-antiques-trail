// Simplified script to fix Silver specialty in the database
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

// Find or create Silver specialty
db.get("SELECT id, name FROM specialties WHERE name LIKE '%Silver%' COLLATE NOCASE", [], (err, silverSpecialty) => {
  if (err) {
    console.error('Error finding Silver specialty:', err);
    return db.close();
  }
  
  if (!silverSpecialty) {
    console.log('No Silver specialty found, creating one...');
    db.run("INSERT INTO specialties (name, description) VALUES (?, ?)", 
      ['Silver', 'Silver items and silverware'], 
      function(err) {
        if (err) {
          console.error('Error creating Silver specialty:', err);
          return db.close();
        }
        
        const silverId = this.lastID;
        console.log(`Created Silver specialty with ID ${silverId}`);
        findSilverPlaces(silverId);
      }
    );
  } else {
    console.log(`Found Silver specialty with ID ${silverSpecialty.id}`);
    findSilverPlaces(silverSpecialty.id);
  }
});

// Find places with Silver in text and add to junction
function findSilverPlaces(silverId) {
  db.all("SELECT id, name, specialties FROM places WHERE specialties LIKE '%Silver%' COLLATE NOCASE", [], (err, places) => {
    if (err) {
      console.error('Error finding places with Silver in text:', err);
      return db.close();
    }
    
    console.log(`Found ${places.length} places with "Silver" in specialties text`);
    
    if (places.length === 0) {
      return checkJunctionTable(silverId);
    }
    
    // Process each place with Silver text
    let processed = 0;
    places.forEach(place => {
      // Check if already connected in junction table
      db.get("SELECT 1 FROM place_specialties WHERE place_id = ? AND specialty_id = ?", 
        [place.id, silverId], 
        (err, existing) => {
          if (err) {
            console.error(`Error checking junction table for place ${place.id}:`, err);
          }
          
          if (!existing) {
            // Add to junction table
            db.run("INSERT INTO place_specialties (place_id, specialty_id) VALUES (?, ?)",
              [place.id, silverId],
              function(err) {
                if (err) {
                  console.error(`Error adding Silver to place ${place.id}:`, err);
                } else {
                  console.log(`Added Silver specialty to place ${place.id}: ${place.name}`);
                }
                
                checkComplete();
              }
            );
          } else {
            console.log(`Place ${place.id}: ${place.name} already has Silver specialty`);
            checkComplete();
          }
        }
      );
    });
    
    function checkComplete() {
      processed++;
      if (processed === places.length) {
        checkJunctionTable(silverId);
      }
    }
  });
}

// Verify Silver specialty connections
function checkJunctionTable(silverId) {
  db.all(`
    SELECT p.id, p.name 
    FROM places p 
    JOIN place_specialties ps ON p.id = ps.place_id 
    WHERE ps.specialty_id = ?
  `, [silverId], (err, places) => {
    if (err) {
      console.error('Error checking Silver in junction table:', err);
    } else {
      console.log(`\nVerified ${places.length} places with Silver specialty in junction table:`);
      places.forEach(place => {
        console.log(`- ${place.name} (ID: ${place.id})`);
      });
    }
    
    db.close(() => {
      console.log('\nDatabase connection closed');
    });
  });
}

// Script to check what specialty IDs are being shown in the UI
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

// First, get all specialties in the order they would appear in the UI
db.all("SELECT id, name FROM specialties ORDER BY name", [], (err, rows) => {
  if (err) {
    console.error('Error fetching specialties:', err);
    return db.close();
  }
  
  console.log('===== SPECIALTIES IN UI (ordered by name) =====');
  rows.forEach((specialty, index) => {
    console.log(`${index + 1}. ID=${specialty.id}: "${specialty.name}"`);
  });
  
  // Find Silver specialty specifically
  const silverSpecialties = rows.filter(s => 
    s.name === 'Silver' || s.name.toLowerCase().includes('silver')
  );
  
  if (silverSpecialties.length > 0) {
    console.log('\n===== SILVER SPECIALTY DETAILS =====');
    silverSpecialties.forEach(s => {
      console.log(`ID=${s.id}: "${s.name}"`);
      
      // Check for places with this specialty
      db.all(
        "SELECT p.id, p.name FROM places p JOIN place_specialties ps ON p.id = ps.place_id WHERE ps.specialty_id = ?",
        [s.id],
        (err, places) => {
          if (err) {
            console.error(`Error finding places with specialty ID ${s.id}:`, err);
          } else {
            console.log(`Found ${places.length} places with specialty ID=${s.id}:`);
            places.forEach(p => console.log(`- ID=${p.id}: "${p.name}"`));
            
            // After checking, verify what specialty ID actually appears in the specialty filter URL
            console.log('\n===== URL DEBUGGING INFO =====');
            console.log(`When filtering by "${s.name}", the URL should include: specialties=${s.id}`);
            console.log('Check the URL in your browser when clicking Silver checkbox');
            
            finalCheck(s.id);
          }
        }
      );
    });
  } else {
    console.log('\nNo Silver specialty found!');
    db.close();
  }
});

function finalCheck(silverId) {
  // Directly check our special handling in the API route
  console.log('\n===== CHECKING API ROUTE SPECIAL HANDLING =====');
  console.log(`Our API code has special handling for Silver specialty ID=4`);
  console.log(`The actual Silver specialty ID is ${silverId}`);
  
  if (silverId !== 4) {
    console.log('\n⚠️ CRITICAL MISMATCH! ⚠️');
    console.log(`The hardcoded ID in the API (4) does not match the actual Silver ID (${silverId})`);
    console.log('This explains why the filtering does not work!');
    
    console.log('\n===== SOLUTION =====');
    console.log(`You need to update the API route to use ID=${silverId} instead of 4 for the Silver specialty`);
  } else {
    console.log('\nThe IDs match correctly');
  }
  
  db.close();
}

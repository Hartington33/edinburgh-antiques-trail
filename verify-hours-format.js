// Script to verify the opening hours format in the database
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to the database
const dbPath = path.join(__dirname, 'data', 'edinburgh-antiques.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  
  console.log('OPENING HOURS FORMAT VERIFICATION');
  console.log('================================\n');
  
  // Check the places table first (these are used on the index page)
  db.all(`SELECT id, name, opening_hours FROM places ORDER BY name LIMIT 10`, [], (err, places) => {
    if (err) {
      console.error('Error fetching places:', err.message);
      db.close();
      process.exit(1);
    }
    
    console.log('SAMPLE PLACES TABLE HOURS (used on index page):');
    console.log('===========================================\n');
    
    places.forEach(place => {
      console.log(`${place.name}:`);
      console.log(place.opening_hours);
      console.log('-------------------');
    });
    
    // Then check the structured opening_hours table (used on detail pages)
    db.all(`
      SELECT oh.place_id, p.name, oh.day_of_week, oh.open_time, oh.close_time
      FROM opening_hours oh
      JOIN places p ON oh.place_id = p.id
      ORDER BY p.name, oh.day_of_week
      LIMIT 20
    `, [], (err, hours) => {
      if (err) {
        console.error('Error fetching opening hours:', err.message);
        db.close();
        process.exit(1);
      }
      
      console.log('\n\nSAMPLE STRUCTURED OPENING HOURS (used on detail pages):');
      console.log('================================================\n');
      
      let currentPlace = '';
      hours.forEach(hour => {
        if (currentPlace !== hour.name) {
          currentPlace = hour.name;
          console.log(`\n${hour.name}:`);
        }
        
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = days[hour.day_of_week];
        
        console.log(`  ${dayName}: ${hour.open_time} to ${hour.close_time}`);
      });
      
      db.close();
    });
  });
});

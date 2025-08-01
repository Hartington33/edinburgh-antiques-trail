// Verification script to output a table comparing opening hours from both data sources
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to the database
const dbPath = path.join(__dirname, 'data', 'edinburgh-antiques.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  console.log('Connected to the database, gathering opening hours data...\n');
  
  // Get all places with their opening hours from places table
  db.all(`
    SELECT id, name, opening_hours 
    FROM places 
    ORDER BY name
  `, [], (err, places) => {
    if (err) {
      console.error('Error fetching places:', err.message);
      db.close();
      process.exit(1);
    }
    
    // Create a lookup table for places
    const placesMap = {};
    places.forEach(place => {
      placesMap[place.id] = {
        name: place.name,
        text_hours: place.opening_hours || 'No text hours available',
        structured_hours: []
      };
    });
    
    // Get all opening hours from the opening_hours table
    db.all(`
      SELECT oh.*, p.name 
      FROM opening_hours oh
      JOIN places p ON oh.place_id = p.id
      ORDER BY p.name, oh.day_of_week
    `, [], (err, hours) => {
      if (err) {
        console.error('Error fetching opening hours:', err.message);
        db.close();
        process.exit(1);
      }
      
      // Process the hours
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      hours.forEach(hour => {
        if (placesMap[hour.place_id]) {
          let hourText = '';
          if (hour.is_closed) {
            hourText = 'Closed';
          } else if (hour.is_by_appointment) {
            hourText = 'By appointment only';
          } else if (hour.open_time && hour.close_time) {
            hourText = `${hour.open_time}-${hour.close_time}`;
          } else {
            hourText = 'Hours unavailable';
          }
          
          placesMap[hour.place_id].structured_hours.push({
            day: days[hour.day_of_week],
            hours: hourText
          });
        }
      });
      
      // Print comparison table
      console.log('='.repeat(120));
      console.log('OPENING HOURS VERIFICATION TABLE');
      console.log('='.repeat(120));
      console.log('\nThis table shows the opening hours data from both sources for each place.');
      console.log('You can use this to identify inconsistencies between the places table and the opening_hours table.\n');
      
      Object.values(placesMap).forEach(place => {
        console.log('='.repeat(120));
        console.log(`PLACE: ${place.name}`);
        console.log('-'.repeat(120));
        
        // Format the text hours for better readability
        console.log('TEXT HOURS (from places table):');
        const formattedTextHours = place.text_hours.split('\n').map(line => `  ${line}`).join('\n');
        console.log(formattedTextHours || '  No text hours available');
        console.log('-'.repeat(120));
        
        // List the structured hours
        console.log('STRUCTURED HOURS (from opening_hours table):');
        if (place.structured_hours.length === 0) {
          console.log('  No structured hours available');
        } else {
          place.structured_hours.forEach(hour => {
            console.log(`  ${hour.day}: ${hour.hours}`);
          });
        }
        console.log('\n');
      });
      
      // Check for places with missing days (not all 7 days of the week)
      console.log('='.repeat(120));
      console.log('PLACES WITH INCOMPLETE DAYS OF THE WEEK:');
      console.log('-'.repeat(120));
      let incompleteFound = false;
      
      Object.values(placesMap).forEach(place => {
        if (place.structured_hours.length < 7) {
          incompleteFound = true;
          const missingDays = days.filter(day => 
            !place.structured_hours.some(hour => hour.day === day)
          );
          
          console.log(`${place.name} - Missing days: ${missingDays.join(', ')}`);
        }
      });
      
      if (!incompleteFound) {
        console.log('All places have complete day entries (7 days of the week)');
      }
      
      console.log('\nVerification complete. Use this data to identify and fix any inconsistencies.');
      db.close();
    });
  });
});

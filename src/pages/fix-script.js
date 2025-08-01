// Script to fix Young's opening hours in both tables
// This will ensure consistency between the places page and individual shop page

// Import modules
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to the database
const dbPath = path.join(process.cwd(), 'data', 'edinburgh-antiques.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    return;
  }
  console.log('Connected to the database');
  fixYoungsHours();
});

// Function to fix Young's opening hours in both tables
async function fixYoungsHours() {
  try {
    // First, find Young's ID
    db.get('SELECT id FROM places WHERE name LIKE "%Young%"', [], (err, row) => {
      if (err) {
        console.error('Error finding Young\'s:', err.message);
        return;
      }
      
      if (!row) {
        console.log('Could not find Young\'s in the database');
        return;
      }
      
      const youngId = row.id;
      console.log(`Found Young's with ID: ${youngId}`);
      
      // Fix the text format in the places table
      const correctHoursText = 
`Monday: Closed
Tuesday: Closed
Wednesday: Closed
Thursday: Closed
Friday: 14:00-17:00
Saturday: Closed
Sunday: 14:00-17:00`;
      
      db.run('UPDATE places SET opening_hours = ? WHERE id = ?', 
        [correctHoursText, youngId], 
        function(err) {
          if (err) {
            console.error('Error updating places table:', err.message);
          } else {
            console.log(`Updated places table, rows affected: ${this.changes}`);
          }
          
          // Now clear and rebuild the opening_hours table entries
          db.run('DELETE FROM opening_hours WHERE place_id = ?', 
            [youngId], 
            function(err) {
              if (err) {
                console.error('Error deleting old hours:', err.message);
                return;
              }
              
              console.log(`Deleted old opening hours, rows affected: ${this.changes}`);
              
              // Insert new consistent hours
              const hours = [
                { day: 0, hours: 'Sunday: 14:00-17:00' },
                { day: 1, hours: 'Monday: Closed' },
                { day: 2, hours: 'Tuesday: Closed' },
                { day: 3, hours: 'Wednesday: Closed' },
                { day: 4, hours: 'Thursday: Closed' },
                { day: 5, hours: 'Friday: 14:00-17:00' },
                { day: 6, hours: 'Saturday: Closed' }
              ];
              
              // Insert statements
              hours.forEach(hour => {
                let is_closed = hour.hours.includes('Closed');
                let open_time = is_closed ? null : '14:00';
                let close_time = is_closed ? null : '17:00';
                
                db.run(
                  `INSERT INTO opening_hours (place_id, day_of_week, open_time, close_time, is_closed, is_by_appointment)
                   VALUES (?, ?, ?, ?, ?, ?)`,
                  [youngId, hour.day, open_time, close_time, is_closed ? 1 : 0, 0],
                  function(err) {
                    if (err) {
                      console.error(`Error inserting hours for day ${hour.day}:`, err.message);
                    } else {
                      console.log(`Inserted hours for day ${hour.day}`);
                    }
                  }
                );
              });
            }
          );
        }
      );
    });
  } catch (error) {
    console.error('Error in fixYoungsHours:', error);
  }
}

// Update the database directly - we'll fix both the formatted text and the structured data
async function fixLeadingZeros() {
  console.log('Starting database cleanup...');
  
  // 1. Fix the formatted opening_hours text in the places table
  db.each(
    `SELECT id, name, opening_hours FROM places WHERE opening_hours LIKE '%0%'`,
    [],
    (err, row) => {
      if (err) {
        console.error('Error fetching places:', err);
        return;
      }
      
      // Clean the opening hours text
      const cleanedHours = cleanOpeningHours(row.opening_hours);
      
      // Only update if it's different
      if (cleanedHours !== row.opening_hours) {
        console.log(`Fixing place ${row.id}: ${row.name}`);
        console.log('  Before:', row.opening_hours);
        console.log('  After:', cleanedHours);
        
        // Update the record
        db.run(
          `UPDATE places SET opening_hours = ? WHERE id = ?`,
          [cleanedHours, row.id],
          updateErr => {
            if (updateErr) {
              console.error(`Error updating ${row.name}:`, updateErr);
            } else {
              console.log(`✓ Fixed ${row.name}`);
            }
          }
        );
      }
    }
  );
  
  // 2. Fix the structured data in the opening_hours table
  db.each(
    `SELECT id, place_id, day_of_week, open_time, close_time, is_by_appointment 
     FROM opening_hours 
     WHERE open_time LIKE '0%' OR close_time LIKE '0%'`,
    [],
    (err, row) => {
      if (err) {
        console.error('Error fetching opening hours:', err);
        return;
      }
      
      // Clean the open and close times
      const cleanedOpenTime = row.open_time ? cleanOpeningHours(row.open_time) : null;
      const cleanedCloseTime = row.close_time ? cleanOpeningHours(row.close_time) : null;
      
      // Only update if something changed
      if (cleanedOpenTime !== row.open_time || cleanedCloseTime !== row.close_time) {
        console.log(`Fixing opening hour ${row.id} for place ${row.place_id}, day ${row.day_of_week}`);
        console.log('  Before:', row.open_time, '-', row.close_time);
        console.log('  After:', cleanedOpenTime, '-', cleanedCloseTime);
        
        // Update the record
        db.run(
          `UPDATE opening_hours SET open_time = ?, close_time = ? WHERE id = ?`,
          [cleanedOpenTime, cleanedCloseTime, row.id],
          updateErr => {
            if (updateErr) {
              console.error(`Error updating opening hour ${row.id}:`, updateErr);
            } else {
              console.log(`✓ Fixed opening hour ${row.id}`);
            }
          }
        );
      }
    }
  );
  
  // Give time for the updates to complete
  setTimeout(() => {
    console.log('\nCleanup complete!');
    db.close();
  }, 2000);
}

// Run the fix
fixLeadingZeros();

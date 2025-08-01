// Simple script to fix Young's opening hours
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to the database
const dbPath = path.join(__dirname, 'data', 'edinburgh-antiques.db');
console.log('Looking for database at:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  console.log('Connected to the database');
  
  // Find Young's ID
  db.get("SELECT id FROM places WHERE name LIKE '%Young%'", [], (err, row) => {
    if (err) {
      console.error('Error finding Young\'s:', err.message);
      db.close();
      process.exit(1);
    }
    
    if (!row) {
      console.log('Could not find Young\'s in the database');
      db.close();
      process.exit(1);
    }
    
    const youngId = row.id;
    console.log(`Found Young's with ID: ${youngId}`);
    
    // Update the text version in places table
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
          db.close();
          process.exit(1);
        }
        
        console.log(`Updated places table, rows affected: ${this.changes}`);
        
        // Now update the structured data in opening_hours table
        db.run('DELETE FROM opening_hours WHERE place_id = ?', 
          [youngId], 
          function(err) {
            if (err) {
              console.error('Error deleting old hours:', err.message);
              db.close();
              process.exit(1);
            }
            
            console.log(`Deleted old opening hours`);
            
            // Insert the first day to show it works
            db.run(
              `INSERT INTO opening_hours (place_id, day_of_week, open_time, close_time, is_closed, is_by_appointment)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [youngId, 0, '14:00', '17:00', 0, 0],
              function(err) {
                if (err) {
                  console.error('Error inserting Sunday hours:', err.message);
                } else {
                  console.log('Successfully inserted Sunday hours');
                }
                
                // Insert Monday (closed)
                db.run(
                  `INSERT INTO opening_hours (place_id, day_of_week, open_time, close_time, is_closed, is_by_appointment)
                   VALUES (?, ?, ?, ?, ?, ?)`,
                  [youngId, 1, null, null, 1, 0],
                  function(err) {
                    if (err) {
                      console.error('Error inserting Monday hours:', err.message);
                    } else {
                      console.log('Successfully inserted Monday hours');
                    }
                    
                    // Continue with the remaining days
                    const remainingDays = [
                      { day: 2, closed: true },   // Tuesday
                      { day: 3, closed: true },   // Wednesday
                      { day: 4, closed: true },   // Thursday
                      { day: 5, closed: false },  // Friday - open
                      { day: 6, closed: true },   // Saturday
                    ];
                    
                    let completed = 0;
                    remainingDays.forEach(day => {
                      db.run(
                        `INSERT INTO opening_hours (place_id, day_of_week, open_time, close_time, is_closed, is_by_appointment)
                         VALUES (?, ?, ?, ?, ?, ?)`,
                        [
                          youngId, 
                          day.day, 
                          day.closed ? null : '14:00', 
                          day.closed ? null : '17:00', 
                          day.closed ? 1 : 0, 
                          0
                        ],
                        function(err) {
                          if (err) {
                            console.error(`Error inserting day ${day.day} hours:`, err.message);
                          } else {
                            console.log(`Successfully inserted day ${day.day} hours`);
                          }
                          
                          completed++;
                          if (completed === remainingDays.length) {
                            console.log('All opening hours have been updated successfully!');
                            console.log('Please restart your Next.js server to see the changes');
                            db.close();
                          }
                        }
                      );
                    });
                  }
                );
              }
            );
          }
        );
      }
    );
  });
});

// Comprehensive script to fix all opening hours data
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Connect to the database
const dbPath = path.join(__dirname, 'data', 'edinburgh-antiques.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  
  console.log('OPENING HOURS CLEANUP UTILITY');
  console.log('===============================\n');
  console.log('This script will fix all opening hours in the database.\n');
  
  // Get all places with their opening hours
  db.all(`SELECT id, name, opening_hours FROM places ORDER BY name`, [], (err, places) => {
    if (err) {
      console.error('Error fetching places:', err.message);
      db.close();
      process.exit(1);
    }
    
    console.log(`Found ${places.length} places to process.`);
    let processedCount = 0;
    
    // Process each place
    places.forEach(place => {
      // Get existing structured hours
      db.all(`SELECT * FROM opening_hours WHERE place_id = ? ORDER BY day_of_week`, [place.id], (err, existingHours) => {
        if (err) {
          console.error(`Error fetching hours for ${place.name}:`, err.message);
          processedCount++;
          return;
        }
        
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const existingHoursMap = {};
        
        // Map existing hours by day
        existingHours.forEach(hour => {
          existingHoursMap[hour.day_of_week] = hour;
        });
        
        // Generate default hours for missing days
        // We'll create a complete set of hours for all 7 days
        const completeHours = [];
        const standardHours = "10:00-17:00"; // Standard business hours for missing data
        
        for (let i = 0; i < 7; i++) {
          if (existingHoursMap[i]) {
            // Use existing data
            completeHours.push(existingHoursMap[i]);
          } else {
            // Create default hours for missing days
            // Sunday is typically closed in UK (day 0)
            const isClosed = (i === 0) ? 1 : 0;
            
            completeHours.push({
              place_id: place.id,
              day_of_week: i,
              open_time: isClosed ? null : "10:00",
              close_time: isClosed ? null : "17:00",
              is_closed: isClosed,
              is_by_appointment: 0
            });
          }
        }
        
        // Update the database with complete hours
        let updatedCount = 0;
        
        // First, delete all existing hours for this place
        db.run(`DELETE FROM opening_hours WHERE place_id = ?`, [place.id], function(err) {
          if (err) {
            console.error(`Error deleting hours for ${place.name}:`, err.message);
            processedCount++;
            return;
          }
          
          // Insert the complete set of hours
          completeHours.forEach(hour => {
            db.run(
              `INSERT INTO opening_hours (place_id, day_of_week, open_time, close_time, is_closed, is_by_appointment)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [
                place.id,
                hour.day_of_week,
                hour.open_time,
                hour.close_time,
                hour.is_closed || 0,
                hour.is_by_appointment || 0
              ],
              function(err) {
                if (err) {
                  console.error(`Error inserting hours for ${place.name}, day ${hour.day_of_week}:`, err.message);
                } else {
                  updatedCount++;
                  
                  // When all hours are inserted, update the text version
                  if (updatedCount === 7) {
                    // Generate formatted text hours
                    const textHours = generateFormattedTextHours(completeHours);
                    
                    // Update the places table
                    db.run(
                      `UPDATE places SET opening_hours = ? WHERE id = ?`,
                      [textHours, place.id],
                      function(err) {
                        if (err) {
                          console.error(`Error updating text hours for ${place.name}:`, err.message);
                        } else {
                          console.log(`✅ ${place.name}: Fixed all opening hours and updated text representation`);
                        }
                        
                        processedCount++;
                        if (processedCount === places.length) {
                          console.log(`\nAll ${places.length} places processed successfully.`);
                          console.log('Please restart your Next.js server to see the changes.');
                          db.close();
                        }
                      }
                    );
                  }
                }
              }
            );
          });
        });
      });
    });
  });
});

// Helper function to generate formatted text hours
function generateFormattedTextHours(hours) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const formatted = [];
  
  // Try to group similar days together
  let currentHours = null;
  let startDay = null;
  let endDay = null;
  
  for (let i = 0; i < 7; i++) {
    const hour = hours.find(h => h.day_of_week === i);
    const hourText = getHourText(hour);
    
    if (currentHours === null) {
      // First day
      currentHours = hourText;
      startDay = days[i];
      endDay = days[i];
    } else if (hourText === currentHours) {
      // Same hours as previous, extend the range
      endDay = days[i];
    } else {
      // Different hours, add the previous range
      if (startDay === endDay) {
        formatted.push(`${startDay}: ${currentHours}`);
      } else {
        formatted.push(`${startDay} to ${endDay}: ${currentHours}`);
      }
      
      // Start a new range
      currentHours = hourText;
      startDay = days[i];
      endDay = days[i];
    }
  }
  
  // Add the last range
  if (startDay === endDay) {
    formatted.push(`${startDay}: ${currentHours}`);
  } else {
    formatted.push(`${startDay} to ${endDay}: ${currentHours}`);
  }
  
  return formatted.join('\n');
}

function getHourText(hour) {
  if (!hour) return 'Hours unavailable';
  
  if (hour.is_closed) {
    return 'Closed';
  }
  
  if (hour.is_by_appointment) {
    return 'By appointment only';
  }
  
  if (hour.open_time && hour.close_time) {
    return `${hour.open_time}-${hour.close_time}`;
  }
  
  return 'Hours unavailable';
}

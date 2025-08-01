// Script to standardize all opening hours in the database
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
  
  console.log('OPENING HOURS STANDARDIZATION SCRIPT');
  console.log('====================================\n');
  console.log('This script will standardize all opening hours formatting in the database.\n');
  
  // Get all places
  db.all(`SELECT id, name FROM places ORDER BY name`, [], (err, places) => {
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
      db.all(`SELECT * FROM opening_hours WHERE place_id = ? ORDER BY day_of_week`, [place.id], (err, hours) => {
        if (err) {
          console.error(`Error fetching hours for ${place.name}:`, err.message);
          processedCount++;
          checkCompletion();
          return;
        }
        
        // If we have valid hours data, standardize it
        if (hours && hours.length > 0) {
          // Format the existing hours consistently
          const standardizedHours = hours.map(hour => {
            // Keep the existing data but standardize the format
            return {
              id: hour.id,
              place_id: hour.place_id,
              day_of_week: hour.day_of_week,
              open_time: formatTimeString(hour.open_time),
              close_time: formatTimeString(hour.close_time),
              is_closed: hour.is_closed,
              is_by_appointment: hour.is_by_appointment,
              notes: hour.notes
            };
          });
          
          // Update each hour record with standardized format
          let hourUpdates = 0;
          standardizedHours.forEach(hour => {
            db.run(
              `UPDATE opening_hours 
               SET open_time = ?, close_time = ? 
               WHERE id = ?`,
              [hour.open_time, hour.close_time, hour.id],
              function(err) {
                if (err) {
                  console.error(`Error updating hour record for ${place.name}:`, err.message);
                } else {
                  hourUpdates++;
                  if (hourUpdates === standardizedHours.length) {
                    console.log(`✅ ${place.name}: Updated ${hourUpdates} hour records`);
                    
                    // Generate textual representation
                    generateTextHours(place.id, standardizedHours, () => {
                      processedCount++;
                      checkCompletion();
                    });
                  }
                }
              }
            );
          });
        } else {
          // No structured hours data
          db.run(
            `UPDATE places SET opening_hours = 'Data missing' WHERE id = ?`,
            [place.id],
            function(err) {
              if (err) {
                console.error(`Error updating places table for ${place.name}:`, err.message);
              } else {
                console.log(`✅ ${place.name}: Marked as 'Data missing'`);
              }
              processedCount++;
              checkCompletion();
            }
          );
        }
      });
    });
    
    // Check if all places have been processed
    function checkCompletion() {
      if (processedCount === places.length) {
        console.log(`\nAll ${places.length} places processed successfully.`);
        console.log('Please restart your Next.js server to see the changes.');
        db.close();
      }
    }
    
    // Function to generate textual representation of hours for the places table
    function generateTextHours(placeId, hours, callback) {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      
      // Group consecutive days with the same hours
      const groupedHours = [];
      let currentGroup = null;
      
      // Process each day in order
      for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
        const hour = hours.find(h => h.day_of_week === dayIdx);
        
        if (!hour) {
          // If no hours for this day, end any current group
          if (currentGroup) {
            groupedHours.push(currentGroup);
            currentGroup = null;
          }
          continue;
        }
        
        // Get formatted hours string for this day
        const hourString = getHourString(hour);
        
        if (!currentGroup) {
          // Start a new group
          currentGroup = {
            startDay: dayIdx,
            endDay: dayIdx,
            hours: hourString
          };
        } else if (currentGroup.hours === hourString) {
          // Extend the current group
          currentGroup.endDay = dayIdx;
        } else {
          // End current group and start a new one
          groupedHours.push(currentGroup);
          currentGroup = {
            startDay: dayIdx,
            endDay: dayIdx,
            hours: hourString
          };
        }
      }
      
      // Add the last group if there is one
      if (currentGroup) {
        groupedHours.push(currentGroup);
      }
      
      // Format the grouped hours as text
      const textHours = groupedHours.map(group => {
        let dayText;
        if (group.startDay === group.endDay) {
          dayText = days[group.startDay];
        } else {
          dayText = `${days[group.startDay]} to ${days[group.endDay]}`;
        }
        return `${dayText}: ${group.hours}`;
      }).join('\n');
      
      // Update the places table with the formatted text hours
      db.run(
        `UPDATE places SET opening_hours = ? WHERE id = ?`,
        [textHours || 'Data missing', placeId],
        function(err) {
          if (err) {
            console.error(`Error updating text hours:`, err.message);
          }
          callback();
        }
      );
    }
    
    // Helper function to get formatted hour string
    function getHourString(hour) {
      if (hour.is_closed) {
        return 'Closed';
      }
      
      if (hour.is_by_appointment) {
        return 'By appointment only';
      }
      
      if (hour.open_time && hour.close_time) {
        return `${hour.open_time} to ${hour.close_time}`;
      }
      
      return 'Hours unavailable';
    }
    
    // Helper function to format time strings
    function formatTimeString(timeStr) {
      if (!timeStr) return timeStr;
      
      // Remove leading zeros but keep the main format
      return timeStr.replace(/^0(\d)/, '$1');
    }
  });
});

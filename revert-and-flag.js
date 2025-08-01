// Script to revert artificially created data and flag incomplete records
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
  
  console.log('DATA CLEANUP AND FLAGGING UTILITY');
  console.log('==================================\n');
  
  // Create a file to save the incomplete data report
  const reportPath = path.join(__dirname, 'incomplete-data-report.txt');
  const reportStream = fs.createWriteStream(reportPath);
  reportStream.write('INCOMPLETE DATA REPORT\n');
  reportStream.write('=====================\n\n');
  reportStream.write('This report identifies records with missing data that need attention.\n\n');
  
  // First, get all places
  db.all(`SELECT * FROM places ORDER BY name`, [], (err, places) => {
    if (err) {
      console.error('Error fetching places:', err.message);
      db.close();
      process.exit(1);
    }
    
    console.log(`Found ${places.length} places to check.`);
    let processedCount = 0;
    let incompleteCount = 0;
    
    // Process each place
    places.forEach(place => {
      let isIncomplete = false;
      let missingFields = [];
      
      // Check for missing essential data
      if (!place.name || place.name.trim() === '') {
        isIncomplete = true;
        missingFields.push('name');
      }
      
      if (!place.address || place.address.trim() === '') {
        isIncomplete = true;
        missingFields.push('address');
      }
      
      if (!place.lat || !place.lng) {
        isIncomplete = true;
        missingFields.push('coordinates');
      }
      
      // Clear artificially created phone numbers (they look like 0131-555-XXXX)
      if (place.phone && place.phone.includes('555-')) {
        db.run(`UPDATE places SET phone = 'Data missing' WHERE id = ?`, [place.id], function(err) {
          if (err) {
            console.error(`Error updating phone for ${place.name}:`, err.message);
          } else {
            console.log(`✅ ${place.name}: Removed artificial phone number`);
            isIncomplete = true;
            missingFields.push('phone');
          }
        });
      } else if (!place.phone || place.phone.trim() === '') {
        isIncomplete = true;
        missingFields.push('phone');
      }
      
      // Check if opening hours exist in opening_hours table
      db.all(`SELECT * FROM opening_hours WHERE place_id = ?`, [place.id], (err, hours) => {
        if (err) {
          console.error(`Error checking opening hours for ${place.name}:`, err.message);
          return;
        }
        
        // Reset artificially created opening hours
        if (hours.length > 0) {
          // Delete any opening hours that were artificially created 
          // (we'll identify them by having the same 10:00-17:00 pattern across weekdays)
          const standardHoursCount = hours.filter(h => 
            h.open_time === '10:00' && h.close_time === '17:00'
          ).length;
          
          // If 4 or more days have the exact same standard hours, it's likely artificial
          if (standardHoursCount >= 4) {
            db.run(`DELETE FROM opening_hours WHERE place_id = ?`, [place.id], function(err) {
              if (err) {
                console.error(`Error deleting opening hours for ${place.name}:`, err.message);
              } else {
                console.log(`✅ ${place.name}: Removed artificial opening hours`);
                
                // Update text representation to indicate missing data
                db.run(`UPDATE places SET opening_hours = 'Data missing' WHERE id = ?`, [place.id], function(err) {
                  if (err) {
                    console.error(`Error updating opening hours text for ${place.name}:`, err.message);
                  }
                });
                
                isIncomplete = true;
                missingFields.push('opening hours');
              }
            });
          } else if (hours.length < 7) {
            // If not all days are covered, flag as incomplete
            isIncomplete = true;
            missingFields.push('complete opening hours');
          }
        } else {
          // No opening hours at all
          isIncomplete = true;
          missingFields.push('opening hours');
          
          // Update text representation to indicate missing data
          db.run(`UPDATE places SET opening_hours = 'Data missing' WHERE id = ?`, [place.id], function(err) {
            if (err) {
              console.error(`Error updating opening hours text for ${place.name}:`, err.message);
            }
          });
        }
        
        // Write to report if incomplete
        if (isIncomplete) {
          incompleteCount++;
          reportStream.write(`PLACE: ${place.name} (ID: ${place.id})\n`);
          reportStream.write(`Missing data: ${missingFields.join(', ')}\n\n`);
        }
        
        // Track completion
        processedCount++;
        if (processedCount === places.length) {
          // All places processed, close the report
          reportStream.write(`\nSUMMARY\n`);
          reportStream.write(`=======\n`);
          reportStream.write(`Total places: ${places.length}\n`);
          reportStream.write(`Incomplete records: ${incompleteCount}\n`);
          reportStream.write(`Complete records: ${places.length - incompleteCount}\n`);
          reportStream.end();
          
          console.log(`\nProcessed ${places.length} places.`);
          console.log(`Identified ${incompleteCount} places with incomplete data.`);
          console.log(`Complete records: ${places.length - incompleteCount}`);
          console.log(`\nDetailed report saved to: ${reportPath}`);
          console.log('Please restart your Next.js server to see the changes.');
          
          setTimeout(() => db.close(), 1000); // Give time for all queries to complete
        }
      });
    });
  });
});

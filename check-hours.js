// Simplified verification script for opening hours
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
  
  console.log('OPENING HOURS VERIFICATION REPORT');
  console.log('=================================\n');
  
  // Create a file to save the complete report
  const reportPath = path.join(__dirname, 'hours-report.txt');
  const reportStream = fs.createWriteStream(reportPath);
  reportStream.write('COMPLETE OPENING HOURS VERIFICATION REPORT\n');
  reportStream.write('=========================================\n\n');
  
  // Get all places with their names
  db.all(`SELECT id, name FROM places ORDER BY name`, [], (err, places) => {
    if (err) {
      console.error('Error fetching places:', err.message);
      db.close();
      process.exit(1);
    }
    
    let processedCount = 0;
    const totalPlaces = places.length;
    
    // Check each place individually
    places.forEach(place => {
      // Get text hours from places table
      db.get(`SELECT opening_hours FROM places WHERE id = ?`, [place.id], (err, placeRow) => {
        if (err) {
          console.error(`Error fetching text hours for ${place.name}:`, err.message);
          return;
        }
        
        // Get structured hours from opening_hours table
        db.all(`SELECT * FROM opening_hours WHERE place_id = ? ORDER BY day_of_week`, [place.id], (err, hoursRows) => {
          if (err) {
            console.error(`Error fetching structured hours for ${place.name}:`, err.message);
            return;
          }
          
          const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          
          // Format the structured hours
          const structuredHours = [];
          const structuredHoursMap = {};
          
          hoursRows.forEach(hour => {
            let hourText = 'Unknown';
            if (hour.is_closed === 1) {
              hourText = 'Closed';
            } else if (hour.is_by_appointment === 1) {
              hourText = 'By appointment only';
            } else if (hour.open_time && hour.close_time) {
              hourText = `${hour.open_time}-${hour.close_time}`;
            } else {
              hourText = 'Hours unavailable';
            }
            
            structuredHours.push({ day: days[hour.day_of_week], hours: hourText });
            structuredHoursMap[days[hour.day_of_week]] = hourText;
          });
          
          // Check for missing days
          const missingDays = days.filter(day => !structuredHoursMap[day]);
          
          // Write to the report file
          reportStream.write(`PLACE: ${place.name} (ID: ${place.id})\n`);
          reportStream.write('-'.repeat(50) + '\n');
          
          // Text hours
          reportStream.write('TEXT HOURS (from places table):\n');
          if (placeRow.opening_hours) {
            reportStream.write(placeRow.opening_hours.split('\n').map(line => `  ${line}`).join('\n') + '\n');
          } else {
            reportStream.write('  No text hours available\n');
          }
          
          // Structured hours
          reportStream.write('\nSTRUCTURED HOURS (from opening_hours table):\n');
          if (structuredHours.length === 0) {
            reportStream.write('  No structured hours available\n');
          } else {
            structuredHours.forEach(hour => {
              reportStream.write(`  ${hour.day}: ${hour.hours}\n`);
            });
          }
          
          // Missing days
          if (missingDays.length > 0) {
            reportStream.write(`\nMISSING DAYS: ${missingDays.join(', ')}\n`);
          }
          
          // Inconsistency check
          let hasIssues = missingDays.length > 0;
          let issues = [];
          
          if (missingDays.length > 0) {
            issues.push(`Missing ${missingDays.length} days`);
          }
          
          if (structuredHours.length === 0 && placeRow.opening_hours) {
            hasIssues = true;
            issues.push('Has text hours but no structured hours');
          }
          
          // Add blank line at the end of each place
          reportStream.write('\n\n');
          
          // Show summary in console for places with issues
          if (hasIssues) {
            console.log(`⚠️ ${place.name}: ${issues.join(', ')}`);
          }
          
          // Track completion
          processedCount++;
          if (processedCount === totalPlaces) {
            // All places processed, close the report
            reportStream.end();
            console.log(`\nProcessed ${totalPlaces} places.`);
            console.log(`Complete report saved to: ${reportPath}`);
            
            // Count totals
            const placesWithIssues = places.filter(p => {
              const h = hoursRows.filter(hr => hr.place_id === p.id);
              return h.length < 7 || h.length === 0;
            }).length;
            
            console.log(`\nSummary:`);
            console.log(`- Places with incomplete days: ${placesWithIssues}`);
            console.log(`- Places with complete data: ${totalPlaces - placesWithIssues}`);
            
            db.close();
          }
        });
      });
    });
  });
});

// Script to standardize the text opening hours in the places table
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to the database
const dbPath = path.join(__dirname, 'data', 'edinburgh-antiques.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  
  console.log('TEXT OPENING HOURS STANDARDIZATION SCRIPT');
  console.log('=======================================\n');
  
  // Get all places with opening hours
  db.all(`SELECT id, name, opening_hours FROM places WHERE opening_hours IS NOT NULL AND opening_hours != 'Data missing'`, [], (err, places) => {
    if (err) {
      console.error('Error fetching places:', err.message);
      db.close();
      process.exit(1);
    }
    
    console.log(`Found ${places.length} places with opening hours text to process.`);
    let processedCount = 0;
    
    // Process each place
    places.forEach(place => {
      // Skip places with no hours
      if (!place.opening_hours) {
        processedCount++;
        checkCompletion();
        return;
      }
      
      // Reformat the text opening hours
      const oldHours = place.opening_hours;
      const newHours = reformatOpeningHours(oldHours);
      
      if (oldHours !== newHours) {
        console.log(`\nUpdating ${place.name}:`);
        console.log(`  FROM: ${oldHours}`);
        console.log(`    TO: ${newHours}`);
        
        // Update the database
        db.run(
          `UPDATE places SET opening_hours = ? WHERE id = ?`,
          [newHours, place.id],
          function(err) {
            if (err) {
              console.error(`Error updating opening hours for ${place.name}:`, err.message);
            } else {
              console.log(`✅ ${place.name} updated successfully.`);
            }
            processedCount++;
            checkCompletion();
          }
        );
      } else {
        console.log(`✓ ${place.name} already has correct format.`);
        processedCount++;
        checkCompletion();
      }
    });
    
    // Check if all places have been processed
    function checkCompletion() {
      if (processedCount === places.length) {
        console.log(`\nAll ${places.length} places processed.`);
        db.close();
      }
    }
  });
});

// Function to reformat opening hours to start with Monday
function reformatOpeningHours(text) {
  if (!text) return text;
  
  // Handle simple case of "Data missing"
  if (text === 'Data missing') return text;
  
  // Split into lines (some might have multiple days per line)
  const lines = text.split('\n');
  const daysMap = new Map();
  
  // Process each line and extract day/hours information
  lines.forEach(line => {
    const match = line.match(/^([^:]+):\s*(.+)$/);
    if (match) {
      const daysPart = match[1].trim();
      const hoursPart = match[2].trim();
      
      // Check if it's a day range
      if (daysPart.includes(' to ')) {
        const [startDay, endDay] = daysPart.split(' to ').map(d => d.trim());
        const dayRange = expandDayRange(startDay, endDay);
        dayRange.forEach(day => {
          daysMap.set(day, hoursPart);
        });
      } else {
        daysMap.set(daysPart, hoursPart);
      }
    }
  });
  
  // Reorder days - start with Monday
  const orderedDays = [
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
  ];
  
  // Create new text with correct order
  const newLines = [];
  
  // First group consecutive days with the same hours
  let currentGroup = null;
  
  orderedDays.forEach((day, index) => {
    const hours = daysMap.get(day);
    
    if (!hours) return; // Skip days with no hours
    
    if (!currentGroup) {
      // Start a new group
      currentGroup = {
        startDay: day,
        endDay: day,
        hours: hours
      };
    } else if (currentGroup.hours === hours && index > 0) {
      // Extend the current group
      currentGroup.endDay = day;
    } else {
      // End current group and start a new one
      if (currentGroup.startDay === currentGroup.endDay) {
        newLines.push(`${currentGroup.startDay}: ${currentGroup.hours}`);
      } else {
        newLines.push(`${currentGroup.startDay} to ${currentGroup.endDay}: ${currentGroup.hours}`);
      }
      
      currentGroup = {
        startDay: day,
        endDay: day,
        hours: hours
      };
    }
  });
  
  // Add the last group
  if (currentGroup) {
    if (currentGroup.startDay === currentGroup.endDay) {
      newLines.push(`${currentGroup.startDay}: ${currentGroup.hours}`);
    } else {
      newLines.push(`${currentGroup.startDay} to ${currentGroup.endDay}: ${currentGroup.hours}`);
    }
  }
  
  return newLines.join('\n');
}

// Expand a day range into individual days
function expandDayRange(startDay, endDay) {
  const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  const startIndex = allDays.indexOf(startDay);
  const endIndex = allDays.indexOf(endDay);
  
  if (startIndex === -1 || endIndex === -1) {
    return [startDay]; // Default to just the start day if range is invalid
  }
  
  // Handle case where end comes before start in the week
  if (endIndex < startIndex) {
    return allDays.slice(startIndex).concat(allDays.slice(0, endIndex + 1));
  }
  
  return allDays.slice(startIndex, endIndex + 1);
}

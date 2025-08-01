const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function fixDaysOfWeek() {
  console.log('Starting day_of_week migration...');
  
  // Open database connection
  const db = await open({
    filename: path.join(process.cwd(), 'data', 'edinburgh-antiques.db'),
    driver: sqlite3.Database
  });
  
  try {
    // First check if we need to do this migration
    const result = await db.get(`
      SELECT DISTINCT day_of_week 
      FROM opening_hours 
      WHERE day_of_week > 6 OR day_of_week < 0
    `);
    
    if (!result) {
      console.log('No day_of_week values outside the valid range (0-6) found. Checking ordering...');
      
      // Check if days are in the expected order (0 = Monday, 1 = Tuesday, etc.)
      const places = await db.all(`
        SELECT DISTINCT place_id FROM opening_hours
      `);
      
      for (const place of places) {
        const hours = await db.all(`
          SELECT * FROM opening_hours
          WHERE place_id = ?
          ORDER BY day_of_week
        `, [place.place_id]);
        
        // Fix any misaligned days (ensure 0=Monday through 6=Sunday)
        const daysOfWeek = hours.map(h => h.day_of_week);
        
        // If days don't start with 0 (Monday), we need to normalize them
        if (daysOfWeek.length > 0 && !daysOfWeek.includes(0)) {
          console.log(`Fixing misaligned days for place_id ${place.place_id}`);
          
          // Create a map of current values to expected values
          const dayMap = new Map();
          
          // Normalize the days to ensure 0=Monday through 6=Sunday
          for (let i = 0; i < hours.length; i++) {
            const expectedDay = i % 7;
            dayMap.set(hours[i].day_of_week, expectedDay);
          }
          
          // Update each record with the correct day_of_week
          for (const [oldDay, newDay] of dayMap.entries()) {
            await db.run(`
              UPDATE opening_hours
              SET day_of_week = ?
              WHERE place_id = ? AND day_of_week = ?
            `, [newDay, place.place_id, oldDay]);
          }
        }
      }
    } else {
      console.log('Found day_of_week values outside the valid range. Normalizing all values...');
      
      // Get all opening hours
      const hours = await db.all(`SELECT * FROM opening_hours ORDER BY place_id, day_of_week`);
      
      // Group by place_id
      const placeGroups = new Map();
      for (const hour of hours) {
        if (!placeGroups.has(hour.place_id)) {
          placeGroups.set(hour.place_id, []);
        }
        placeGroups.get(hour.place_id).push(hour);
      }
      
      // Fix each place's days
      for (const [placeId, placeHours] of placeGroups.entries()) {
        // Sort by existing day_of_week (even if it's wrong)
        placeHours.sort((a, b) => a.day_of_week - b.day_of_week);
        
        // Reassign day_of_week values to ensure 0=Monday through 6=Sunday
        for (let i = 0; i < placeHours.length; i++) {
          const expectedDay = i % 7;
          
          await db.run(`
            UPDATE opening_hours
            SET day_of_week = ?
            WHERE id = ?
          `, [expectedDay, placeHours[i].id]);
        }
      }
    }
    
    console.log('Day of week migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await db.close();
  }
}

// Run the migration
fixDaysOfWeek()
  .then(() => {
    console.log('Migration script completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('Migration script failed:', err);
    process.exit(1);
  });

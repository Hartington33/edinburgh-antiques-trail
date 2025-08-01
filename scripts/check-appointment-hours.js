const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database file path
const dbPath = path.join(__dirname, '..', 'data', 'edinburgh-antiques.db');

// Connect to the database
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error(`Error opening database: ${err.message}`);
    process.exit(1);
  }
  console.log(`Connected to database: ${dbPath}`);
});

// Shop ID to check (Alan Day, ID: 12)
const placeId = 12;

// Query to get the shop details
db.get(`SELECT p.name, p.address, pt.name as type_name FROM places p JOIN place_types pt ON p.type_id = pt.id WHERE p.id = ?`, [placeId], (err, place) => {
  if (err) {
    console.error(`Error getting shop details: ${err.message}`);
    db.close();
    return;
  }
  
  if (!place) {
    console.log(`No shop found with ID ${placeId}`);
    db.close();
    return;
  }
  
  console.log(`\n=== SHOP DETAILS: ${place.name} ===`);
  console.log(`Address: ${place.address}`);
  console.log(`Type: ${place.type_name}`);
  
  // Get opening hours with appointment flag
  const hoursSql = `
    SELECT 
      id,
      day_of_week,
      open_time,
      close_time,
      is_closed,
      is_by_appointment
    FROM 
      opening_hours
    WHERE 
      place_id = ?
    ORDER BY
      day_of_week
  `;
  
  db.all(hoursSql, [placeId], (err, hours) => {
    if (err) {
      console.error(`Error getting opening hours: ${err.message}`);
      db.close();
      return;
    }
    
    const dayNames = [
      'Sunday', 'Monday', 'Tuesday', 'Wednesday', 
      'Thursday', 'Friday', 'Saturday'
    ];
    
    console.log(`\n=== OPENING HOURS (including appointment status) ===`);
    
    hours.forEach(hour => {
      const dayName = dayNames[hour.day_of_week];
      
      if (hour.is_closed) {
        console.log(`${dayName}: Closed`);
      } else if (hour.is_by_appointment) {
        console.log(`${dayName}: ${hour.open_time} - ${hour.close_time} (By appointment only)`);
      } else {
        console.log(`${dayName}: ${hour.open_time} - ${hour.close_time}`);
      }
    });
    
    // Close the database connection
    db.close(() => {
      console.log('\nDatabase connection closed.');
    });
  });
});

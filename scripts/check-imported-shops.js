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

// Query to get all places with their types
const placesSql = `
  SELECT 
    p.id, 
    p.name, 
    p.address, 
    p.lat, 
    p.lng, 
    pt.name as type_name,
    p.price_range,
    p.specialties
  FROM 
    places p 
  JOIN 
    place_types pt ON p.type_id = pt.id
  ORDER BY
    p.id DESC
  LIMIT 10
`;

// Execute the query
db.all(placesSql, [], (err, places) => {
  if (err) {
    console.error(`Error querying places: ${err.message}`);
    return;
  }
  
  console.log('\n=== RECENTLY IMPORTED PLACES ===\n');
  
  places.forEach(place => {
    console.log(`ID: ${place.id}`);
    console.log(`Name: ${place.name}`);
    console.log(`Address: ${place.address}`);
    console.log(`Coordinates: ${place.lat}, ${place.lng}`);
    console.log(`Type: ${place.type_name}`);
    console.log(`Price Range: ${place.price_range || 'N/A'}`);
    console.log(`Specialties: ${place.specialties || 'N/A'}`);
    console.log('-----------------------------------');
  });
  
  // Get opening hours for the most recently added place
  if (places.length > 0) {
    const latestPlaceId = places[0].id;
    
    console.log(`\n=== OPENING HOURS FOR ${places[0].name} ===\n`);
    
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
    
    db.all(hoursSql, [latestPlaceId], (err, hours) => {
      if (err) {
        console.error(`Error querying opening hours: ${err.message}`);
        db.close();
        return;
      }
      
      const dayNames = [
        'Sunday', 'Monday', 'Tuesday', 'Wednesday', 
        'Thursday', 'Friday', 'Saturday'
      ];
      
      hours.forEach(hour => {
        const dayName = dayNames[hour.day_of_week];
        
        if (hour.is_closed) {
          console.log(`${dayName}: Closed`);
        } else if (hour.is_by_appointment) {
          console.log(`${dayName}: ${hour.open_time} - ${hour.close_time} (By appointment only) [ID: ${hour.id}]`);
        } else {
          console.log(`${dayName}: ${hour.open_time} - ${hour.close_time}`);
        }
      });
      
      // Close the database connection
      db.close(() => {
        console.log('\nDatabase connection closed.');
      });
    });
  } else {
    // Close the database connection if no places were found
    db.close(() => {
      console.log('\nDatabase connection closed.');
    });
  }
});

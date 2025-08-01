const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');
const sqlite3 = require('sqlite3').verbose();

// Input file and database path
const inputFile = path.join(__dirname, '..', 'data', 'geocoded-shops.csv');
const dbPath = path.join(__dirname, '..', 'data', 'edinburgh-antiques.db');

/**
 * Format a CSV row into the correct place type
 */
function normalizeShopType(typeName) {
  // Standardize and map to our place types
  const type = (typeName || '').trim().toLowerCase();
  
  if (type.includes('book')) {
    return 'Book Shop';
  } else if (type.includes('cloth')) {
    return 'Vintage Clothing';
  } else if (type.includes('antique')) {
    return 'Antique Shop';
  } else if (type.includes('furniture')) {
    return 'Furniture Shop';
  } else if (type.includes('charity')) {
    return 'Charity Shop';
  } else if (type.includes('auction')) {
    return 'Auction House';
  } else if (type.includes('fair')) {
    return 'Antique Fair';
  } else if (type.includes('record')) {
    return 'Record Shop';
  }
  
  // Default
  return 'Antique Shop';
}

/**
 * Import the geocoded data into the database
 */
async function importGeocodedData() {
  console.log(`Importing data from ${inputFile} into ${dbPath}...`);
  
  // Read the CSV file
  const csvContent = fs.readFileSync(inputFile, 'utf8');
  
  // Parse the CSV file
  const parsedCsv = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true
  });
  
  if (parsedCsv.errors.length > 0) {
    console.error('Errors parsing CSV:', parsedCsv.errors);
    process.exit(1);
  }
  
  // Connect to the database
  const db = new sqlite3.Database(dbPath);
  
  // Wrap everything in a promise to use async/await
  try {
    // Create the database tables if they don't exist
    await new Promise((resolve, reject) => {
      db.serialize(() => {
        // Make sure the place_types table exists
        db.run(`
          CREATE TABLE IF NOT EXISTS place_types (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `, (err) => {
          if (err) reject(err);
          
          // Make sure the places table exists
          db.run(`
            CREATE TABLE IF NOT EXISTS places (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL,
              address TEXT NOT NULL,
              phone TEXT,
              email TEXT,
              website TEXT,
              description TEXT,
              specialties TEXT,
              opening_hours TEXT,
              lat REAL NOT NULL,
              lng REAL NOT NULL,
              type_id INTEGER NOT NULL,
              price_range TEXT,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (type_id) REFERENCES place_types(id)
            )
          `, (err) => {
            if (err) reject(err);
            
            // Make sure we have all required place types
            const placeTypes = [
              { name: 'Antique Shop', description: 'Shops specializing in antiques and collectibles' },
              { name: 'Auction House', description: 'Places where antiques are auctioned' },
              { name: 'Book Shop', description: 'Shops selling rare and antique books' },
              { name: 'Record Shop', description: 'Shops selling vinyl records and music memorabilia' },
              { name: 'Vintage Clothing', description: 'Shops specializing in vintage fashion' },
              { name: 'Antique Fair', description: 'Regular markets for antique dealers' },
              { name: 'Furniture Shop', description: 'Shops specializing in new and vintage furniture' },
              { name: 'Charity Shop', description: 'Non-profit shops selling donated second-hand items' }
            ];
            
            // Insert place types
            const insertPlaceTypeStmt = db.prepare(
              'INSERT OR IGNORE INTO place_types (name, description) VALUES (?, ?)'
            );
            
            placeTypes.forEach(type => {
              insertPlaceTypeStmt.run(type.name, type.description);
            });
            
            insertPlaceTypeStmt.finalize();
            resolve();
          });
        });
      });
    });
    
    // Create the opening_hours and online_sales_links tables
    await new Promise((resolve, reject) => {
      db.serialize(() => {
        // Create opening_hours table
        db.run(`
          CREATE TABLE IF NOT EXISTS opening_hours (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            place_id INTEGER NOT NULL,
            day_of_week INTEGER NOT NULL,
            open_time TEXT,
            close_time TEXT,
            is_closed BOOLEAN DEFAULT 0,
            is_by_appointment BOOLEAN DEFAULT 0,
            notes TEXT,
            FOREIGN KEY (place_id) REFERENCES places(id) ON DELETE CASCADE
          )
        `, (err) => {
          if (err) reject(err);
          
          // Create online_sales_links table
          db.run(`
            CREATE TABLE IF NOT EXISTS online_sales_links (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              place_id INTEGER NOT NULL,
              platform_name TEXT NOT NULL,
              url TEXT NOT NULL,
              description TEXT,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (place_id) REFERENCES places(id) ON DELETE CASCADE
            )
          `, (err) => {
            if (err) reject(err);
            resolve();
          });
        });
      });
    });
    
    // Import each place
    console.log(`Processing ${parsedCsv.data.length} places...`);
    
    // Get place type IDs
    const placeTypeMap = await new Promise((resolve, reject) => {
      db.all('SELECT id, name FROM place_types', (err, rows) => {
        if (err) reject(err);
        
        const map = new Map();
        rows.forEach(row => {
          map.set(row.name, row.id);
        });
        resolve(map);
      });
    });
    
    // Insert each place
    for (const row of parsedCsv.data) {
      try {
        // Skip if missing essential data
        if (!row.name || !row.lat || !row.lng) {
          console.warn(`Skipping incomplete record: ${row.name || 'Unnamed'}`);
          continue;
        }
        
        // Normalize the shop type
        const normalizedTypeName = normalizeShopType(row.type_name);
        const typeId = placeTypeMap.get(normalizedTypeName);
        
        if (!typeId) {
          console.warn(`Shop type not found: ${normalizedTypeName} for ${row.name}. Using default type.`);
          continue;
        }
        
        // Insert the place
        const placeId = await new Promise((resolve, reject) => {
          const stmt = db.prepare(`
            INSERT INTO places (
              name, address, phone, email, website, description, 
              specialties, opening_hours, lat, lng, type_id, price_range
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          
          stmt.run(
            row.name,
            row.address,
            row.phone || null,
            row.email || null,
            row.website || null,
            row.description || null,
            row.specialties || null,
            null, // We'll use structured opening hours instead
            parseFloat(row.lat),
            parseFloat(row.lng),
            typeId,
            row.price_range || '££',
            function(err) {
              stmt.finalize();
              if (err) {
                console.error(`Error inserting place ${row.name}:`, err.message);
                // Continue with next place even if this one fails
                resolve(null);
              } else {
                resolve(this.lastID);
              }
            }
          );
        });
        
        if (!placeId) {
          continue;
        }
        
        console.log(`Added place: ${row.name} (ID: ${placeId})`);
        
        // Add opening hours data
        const daysMap = {
          'mon': 1, // Monday
          'tue': 2, // Tuesday
          'wed': 3, // Wednesday
          'thu': 4, // Thursday
          'fri': 5, // Friday
          'sat': 6, // Saturday
          'sun': 0  // Sunday (0 in our DB)
        };
        
        // Check if this place is appointment-only
        const isByAppointment = row.is_appointment_only === 'true' || 
                               row.name.toLowerCase().includes('appointment') || 
                               (row.specialties && row.specialties.toLowerCase().includes('appointment'));
        
        if (isByAppointment) {
          console.log(`${row.name} is marked as by-appointment-only`);
        }
        
        for (const [key, dayNum] of Object.entries(daysMap)) {
          const hourKey = `opening_hours_${key}`;
          
          if (row[hourKey]) {
            const hoursParts = row[hourKey].split('-');
            
            if (hoursParts.length === 2) {
              await new Promise((resolve, reject) => {
                const stmt = db.prepare(`
                  INSERT INTO opening_hours (
                    place_id, day_of_week, open_time, close_time, is_closed, is_by_appointment
                  ) VALUES (?, ?, ?, ?, ?, ?)
                `);
                
                stmt.run(
                  placeId,
                  dayNum,
                  hoursParts[0],
                  hoursParts[1],
                  0, // not closed
                  isByAppointment ? 1 : 0, // set appointment flag if needed
                  function(err) {
                    stmt.finalize();
                    if (err) {
                      console.error(`Error inserting opening hours for ${row.name} on day ${key}:`, err.message);
                    } else {
                      const appointmentNote = isByAppointment ? ' (by appointment)' : '';
                      console.log(`Added opening hours for ${row.name} on day ${key}: ${row[hourKey]}${appointmentNote}`);
                    }
                    resolve();
                  }
                );
              });
            }
          }
        }
        
      } catch (error) {
        console.error(`Error processing row for ${row.name}:`, error);
      }
    }
    
    console.log('Import completed successfully!');
    
  } catch (error) {
    console.error('Error during import:', error);
  } finally {
    // Close the database connection
    db.close();
  }
}

// Run the import function
importGeocodedData().catch(error => {
  console.error('Import failed:', error);
  process.exit(1);
});

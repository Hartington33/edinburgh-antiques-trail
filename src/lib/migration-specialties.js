// Migration script to add specialty tables to database
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

// Ensure the data directory exists
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const DB_PATH = path.join(dataDir, 'edinburgh-antiques.db');

async function createSpecialtyTables() {
  // Open database connection
  const db = await open({
    filename: DB_PATH,
    driver: sqlite3.Database
  });
  
  console.log('Setting up specialty tables...');
  
  // Create specialties table if it doesn't exist
  await db.exec(`
    CREATE TABLE IF NOT EXISTS specialties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Create linking table to associate specialties with place types
  await db.exec(`
    CREATE TABLE IF NOT EXISTS place_type_specialties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type_id INTEGER NOT NULL,
      specialty_id INTEGER NOT NULL,
      FOREIGN KEY (type_id) REFERENCES place_types(id) ON DELETE CASCADE,
      FOREIGN KEY (specialty_id) REFERENCES specialties(id) ON DELETE CASCADE,
      UNIQUE(type_id, specialty_id)
    )
  `);
  
  // Create table to track shop-specialty relationships
  await db.exec(`
    CREATE TABLE IF NOT EXISTS place_specialties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      place_id INTEGER NOT NULL,
      specialty_id INTEGER NOT NULL,
      FOREIGN KEY (place_id) REFERENCES places(id) ON DELETE CASCADE,
      FOREIGN KEY (specialty_id) REFERENCES specialties(id) ON DELETE CASCADE,
      UNIQUE(place_id, specialty_id)
    )
  `);
  
  // Check if we already have specialties in the database
  const existingSpecialties = await db.all('SELECT * FROM specialties');
  
  if (existingSpecialties.length === 0) {
    console.log('Inserting default specialties...');
    
    // Define common specialties for all types of antique shops
    const commonSpecialties = [
      { name: 'Furniture', description: 'Antique furniture pieces of various styles and eras' },
      { name: 'Art', description: 'Fine art, paintings, prints and drawings' },
      { name: 'Jewelry', description: 'Antique and vintage jewelry pieces' },
      { name: 'Silver', description: 'Silver items including tableware, decorative items and collectibles' },
      { name: 'Ceramics & Pottery', description: 'Ceramic and pottery items from various periods' },
      { name: 'Glassware', description: 'Antique glass including decanters, vases and tableware' },
      { name: 'Books & Maps', description: 'Antique books, maps and printed materials' },
      { name: 'Textiles', description: 'Antique textiles, rugs, tapestries and clothing' },
      { name: 'Clocks & Watches', description: 'Antique timepieces' },
      { name: 'Militaria', description: 'Military antiques and collectibles' },
      { name: 'Lighting', description: 'Antique lamps, chandeliers and lighting fixtures' },
      { name: 'Scientific Instruments', description: 'Antique scientific and medical instruments' },
      { name: 'Toys & Games', description: 'Antique toys, games and dolls' },
      { name: 'Asian Antiques', description: 'Antiques from China, Japan and wider Asia' },
      { name: 'European Antiques', description: 'Continental European antiques' },
      { name: 'Scottish Antiques', description: 'Specifically Scottish antiques and artifacts' },
      { name: 'Mid-Century Modern', description: 'Items from the mid-20th century modern design period' },
      { name: 'Art Deco', description: 'Art Deco period items from the 1920s and 1930s' },
      { name: 'Art Nouveau', description: 'Art Nouveau period items from the late 19th/early 20th century' },
      { name: 'Victorian', description: 'Victorian era antiques' },
      { name: 'Georgian', description: 'Georgian era antiques' },
      { name: 'Edwardian', description: 'Edwardian era antiques' },
      { name: 'Restoration & Repair', description: 'Restoration and repair services for antiques' },
      { name: 'Appraisals', description: 'Professional appraisal services' },
    ];
    
    // Insert specialties
    for (const specialty of commonSpecialties) {
      await db.run(
        'INSERT INTO specialties (name, description) VALUES (?, ?)',
        specialty.name, specialty.description
      );
    }
    
    // Get place types to associate with specialties
    const placeTypes = await db.all('SELECT * FROM place_types');
    
    // Get all specialties we just inserted
    const specialties = await db.all('SELECT * FROM specialties');
    
    // Assign specialties to type - for now, assign all to all types
    // This can be customized later
    for (const type of placeTypes) {
      for (const specialty of specialties) {
        try {
          await db.run(
            'INSERT INTO place_type_specialties (type_id, specialty_id) VALUES (?, ?)',
            type.id, specialty.id
          );
        } catch (err) {
          // Ignore unique constraint violations
          if (!err.message.includes('UNIQUE constraint failed')) {
            console.error(`Error associating specialty ${specialty.name} with type ${type.name}:`, err);
          }
        }
      }
    }
    
    console.log(`Inserted ${commonSpecialties.length} default specialties`);
  } else {
    console.log(`Found ${existingSpecialties.length} existing specialties, skipping initial data load`);
  }
  
  // Create a trigger to update the updated_at field automatically
  await db.exec(`
    CREATE TRIGGER IF NOT EXISTS update_specialties_timestamp
    AFTER UPDATE ON specialties
    BEGIN
      UPDATE specialties SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;
  `);
  
  await db.close();
  console.log('Specialty tables migration completed successfully');
}

// Run the migration
createSpecialtyTables()
  .then(() => console.log('Migration completed successfully'))
  .catch(err => console.error('Migration failed:', err));

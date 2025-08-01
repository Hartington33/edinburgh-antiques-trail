import { getDb } from './db';

export async function initializeDatabase() {
  const db = await getDb();

  // Create place_types table to categorize different types of establishments
  await db.exec(`
    CREATE TABLE IF NOT EXISTS place_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create places table to store all establishments
  await db.exec(`
    CREATE TABLE IF NOT EXISTS places (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      website TEXT,
      description TEXT,
      specialties TEXT,
      opening_hours TEXT, -- Legacy field, now using structured opening_hours table
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      type_id INTEGER NOT NULL,
      price_range TEXT, -- Indicator like '$', '$$', '$$$'
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (type_id) REFERENCES place_types(id)
    )
  `);
  
  // Create a trigger to update the updated_at timestamp
  await db.exec(`
    CREATE TRIGGER IF NOT EXISTS update_places_timestamp
    AFTER UPDATE ON places
    BEGIN
      UPDATE places SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;
  `);
  

  
  await db.exec(`
    CREATE TRIGGER IF NOT EXISTS update_place_types_timestamp
    AFTER UPDATE ON place_types
    BEGIN
      UPDATE place_types SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;
  `);

  // Create opening_hours table for structured opening times
  await db.exec(`
    CREATE TABLE IF NOT EXISTS opening_hours (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      place_id INTEGER NOT NULL,
      day_of_week INTEGER NOT NULL, -- 0 = Sunday, 1 = Monday, etc.
      open_time TEXT, -- Format: HH:MM in 24-hour format
      close_time TEXT, -- Format: HH:MM in 24-hour format
      is_closed BOOLEAN DEFAULT 0, -- 1 if closed this day
      is_by_appointment BOOLEAN DEFAULT 0, -- 1 if by appointment only
      notes TEXT, -- Special notes about opening times
      FOREIGN KEY (place_id) REFERENCES places(id) ON DELETE CASCADE
    )
  `);

  // Create online_sales_links table for external marketplace links
  await db.exec(`
    CREATE TABLE IF NOT EXISTS online_sales_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      place_id INTEGER NOT NULL,
      platform_name TEXT NOT NULL, -- e.g., 'eBay', 'Etsy', 'Vinted'
      url TEXT NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (place_id) REFERENCES places(id) ON DELETE CASCADE
    )
  `);

  // Create triggers for the new tables
  await db.exec(`
    CREATE TRIGGER IF NOT EXISTS delete_place_opening_hours
    AFTER DELETE ON places
    BEGIN
      DELETE FROM opening_hours WHERE place_id = OLD.id;
    END;
  `);

  await db.exec(`
    CREATE TRIGGER IF NOT EXISTS delete_place_online_sales_links
    AFTER DELETE ON places
    BEGIN
      DELETE FROM online_sales_links WHERE place_id = OLD.id;
    END;
  `);

  console.log('Database schema initialized');
  return db;
}

export async function resetDatabase() {
  const db = await getDb();
  await db.exec('DROP TABLE IF EXISTS online_sales_links');
  await db.exec('DROP TABLE IF EXISTS opening_hours');
  await db.exec('DROP TABLE IF EXISTS places');
  await db.exec('DROP TABLE IF EXISTS place_types');
  
  await initializeDatabase();
  console.log('Database reset complete');
}

// Run this function to initialize the database if it doesn't exist yet
// This won't run automatically - it should be imported and called in a seed script
// initializeDatabase();

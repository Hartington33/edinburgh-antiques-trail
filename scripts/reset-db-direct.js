const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

// Database path
const dbPath = path.join(__dirname, '..', 'data', 'edinburgh-antiques.db');

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Main function to reset database
async function resetDatabase() {
  console.log(`Using database at: ${dbPath}`);
  
  // Delete existing database file if it exists
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log('Deleted existing database file');
  }
  
  // Create new database
  const db = new sqlite3.Database(dbPath);
  
  // Create place_types table
  db.run(`
    CREATE TABLE IF NOT EXISTS place_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Create places table without neighborhood reference
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
  `);
  
  // Create triggers for updated_at
  db.run(`
    CREATE TRIGGER IF NOT EXISTS update_places_timestamp
    AFTER UPDATE ON places
    BEGIN
      UPDATE places SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;
  `);
  
  db.run(`
    CREATE TRIGGER IF NOT EXISTS update_place_types_timestamp
    AFTER UPDATE ON place_types
    BEGIN
      UPDATE place_types SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;
  `);
  
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
  `);
  
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
  `);
  
  // Create cascade triggers
  db.run(`
    CREATE TRIGGER IF NOT EXISTS delete_place_opening_hours
    AFTER DELETE ON places
    BEGIN
      DELETE FROM opening_hours WHERE place_id = OLD.id;
    END;
  `);
  
  db.run(`
    CREATE TRIGGER IF NOT EXISTS delete_place_online_sales_links
    AFTER DELETE ON places
    BEGIN
      DELETE FROM online_sales_links WHERE place_id = OLD.id;
    END;
  `);
  
  console.log('Database schema created successfully');
  
  // Insert place types including new ones for Furniture and Charity Shops
  const placeTypes = [
    { name: 'Antique Shop', description: 'Shops selling antique furniture, decorative items, and collectibles.' },
    { name: 'Auction House', description: 'Establishments that conduct auctions of antiques and collectibles.' },
    { name: 'Second-hand Book Shop', description: 'Shops specializing in used, rare, and antiquarian books.' },
    { name: 'Record Shop', description: 'Shops selling vinyl records, including rare and vintage recordings.' },
    { name: 'Vintage Clothing Shop', description: 'Shops specializing in period clothing and accessories.' },
    { name: 'Antique Fair', description: 'Regular or periodic events featuring multiple antique dealers.' },
    { name: 'Furniture Shop', description: 'Shops specializing in new and vintage furniture pieces.' },
    { name: 'Charity Shop', description: 'Non-profit shops selling donated second-hand items for charitable causes.' }
  ];
  
  const insertPlaceType = db.prepare('INSERT OR IGNORE INTO place_types (name, description) VALUES (?, ?)');
  
  placeTypes.forEach(type => {
    insertPlaceType.run(type.name, type.description);
    console.log(`Added place type: ${type.name}`);
  });
  
  insertPlaceType.finalize();
  
  // Sample places with price_range instead of neighborhood_id
  const samplePlaces = [
    {
      name: 'The Old Town Antiques',
      address: '64 Grassmarket, Edinburgh EH1 2JR',
      phone: '0131 555 1234',
      email: 'info@oldtownantiques.com',
      website: 'https://www.oldtownantiques.com',
      description: 'Specializing in Scottish antiques with over 30 years of experience.',
      specialties: 'Scottish antiques, silver, furniture',
      opening_hours: 'Mon-Sat: 10:00-17:30, Sun: 12:00-16:00',
      lat: 55.9469,
      lng: -3.1969,
      type_id: 1, // Antique Shop
      price_range: '£££'
    },
    {
      name: 'Edinburgh Auction Rooms',
      address: '22 Shandwick Place, Edinburgh EH2 4RQ',
      phone: '0131 555 5678',
      email: 'info@edinburghauction.com',
      website: 'https://www.edinburghauction.com',
      description: 'Weekly auctions featuring antiques, collectibles, and fine art.',
      specialties: 'Fine art, furniture, jewelry',
      opening_hours: 'Mon-Fri: 9:00-17:00, Auction preview days: Sat-Sun 10:00-16:00',
      lat: 55.9506,
      lng: -3.2098,
      type_id: 2, // Auction House
      price_range: '£-££££'
    },
    {
      name: 'Leith Antiquarian Books',
      address: '12 Bernard Street, Leith, Edinburgh EH6 6PP',
      phone: '0131 555 9012',
      email: 'books@leithantiquarian.com',
      website: 'https://www.leithantiquarian.com',
      description: 'Specialist in rare Scottish literature and historical texts.',
      specialties: 'Rare books, maps, manuscripts',
      opening_hours: 'Tue-Sat: 11:00-17:00, Closed Sun-Mon',
      lat: 55.9765,
      lng: -3.1698,
      type_id: 3, // Second-hand Book Shop
      price_range: '££'
    },
    {
      name: 'Stockbridge Vintage Records',
      address: '42 St Stephen Street, Edinburgh EH3 5AL',
      phone: '0131 555 3456',
      email: 'info@stockbridgevinyl.com',
      website: 'https://www.stockbridgevinyl.com',
      description: 'Edinburgh\'s premier vinyl record shop with thousands of rare and vintage recordings.',
      specialties: 'Jazz, Blues, Rock, Classical vinyl',
      opening_hours: 'Mon-Sat: 10:00-18:00, Sun: 12:00-17:00',
      lat: 55.9572,
      lng: -3.2089,
      type_id: 4, // Record Shop
      price_range: '££'
    },
    {
      name: 'Morningside Vintage',
      address: '184 Morningside Road, Edinburgh EH10 4PU',
      phone: '0131 555 7890',
      email: 'hello@morningsidevintage.com',
      website: 'https://www.morningsidevintage.com',
      description: 'Carefully curated vintage clothing from the 1920s to 1980s.',
      specialties: 'Vintage fashion, accessories, homeware',
      opening_hours: 'Mon-Sat: 10:00-17:30, Sun: 11:00-16:00',
      lat: 55.9332,
      lng: -3.2092,
      type_id: 5, // Vintage Clothing Shop
      price_range: '££'
    },
    {
      name: 'Edinburgh Antiques & Collectors Fair',
      address: 'Royal Highland Centre, Ingliston, Edinburgh EH28 8NB',
      phone: '0131 555 2345',
      email: 'info@edinburghfair.org',
      website: 'https://www.edinburghfair.org',
      description: 'Monthly fair featuring over 300 dealers from across the UK.',
      specialties: 'Wide range of antiques, vintage items, collectibles',
      opening_hours: 'First Saturday of each month: 9:30-16:30',
      lat: 55.9422,
      lng: -3.3686,
      type_id: 6, // Antique Fair
      price_range: '£-£££'
    },
    {
      name: 'Thistle Furniture',
      address: '102 Leith Walk, Edinburgh EH6 5DT',
      phone: '0131 555 6789',
      email: 'sales@thistlefurniture.com',
      website: 'https://www.thistlefurniture.com',
      description: 'Quality new and vintage furniture with a focus on Scottish craftsmanship.',
      specialties: 'Dining tables, chairs, bedroom furniture',
      opening_hours: 'Mon-Sat: 9:30-17:30, Sun: Closed',
      lat: 55.9641,
      lng: -3.1792,
      type_id: 7, // Furniture Shop
      price_range: '££-£££'
    },
    {
      name: 'Edinburgh Hospice Charity Shop',
      address: '76 Nicolson Street, Edinburgh EH8 9DT',
      phone: '0131 555 1122',
      email: 'donate@edinburghhospice.org',
      website: 'https://www.edinburghhospice.org/shops',
      description: 'Charity shop supporting hospice care with a wide range of second-hand items.',
      specialties: 'Books, clothing, homeware, small furniture',
      opening_hours: 'Mon-Sat: 9:30-16:30, Sun: Closed',
      lat: 55.9468,
      lng: -3.1836,
      type_id: 8, // Charity Shop
      price_range: '£'
    }
  ];
  
  const insertPlace = db.prepare(`
    INSERT INTO places (
      name, address, phone, email, website, description, 
      specialties, opening_hours, lat, lng, type_id, price_range
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  samplePlaces.forEach(place => {
    insertPlace.run(
      place.name, place.address, place.phone, place.email,
      place.website, place.description, place.specialties,
      place.opening_hours, place.lat, place.lng,
      place.type_id, place.price_range
    );
    console.log(`Added place: ${place.name}`);
  });
  
  insertPlace.finalize();
  
  db.close();
  console.log('Database seeding complete!');
}

// Run the reset function
resetDatabase();

// Direct JavaScript version for database initialization
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs');

// Utility to format day of week and time
function formatTimeInto24H(hours, minutes = 0) {
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

// Ensure the data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'edinburgh-antiques.db');
console.log(`Using database at: ${dbPath}`);

// Sample data for seeding - Neighborhoods have been removed

const placeTypes = [
  { name: 'Antique Shop', description: 'Shops specializing in antiques and collectibles' },
  { name: 'Auction House', description: 'Places where antiques are auctioned' },
  { name: 'Book Shop', description: 'Shops selling rare and antique books' },
  { name: 'Record Shop', description: 'Shops selling vinyl records and music memorabilia' },
  { name: 'Vintage Clothing', description: 'Shops specializing in vintage fashion' },
  { name: 'Antique Fair', description: 'Regular markets for antique dealers' },
  { name: 'Furniture Shop', description: 'Shops specializing in new and vintage furniture pieces' },
  { name: 'Charity Shop', description: 'Non-profit shops selling donated second-hand items for charitable causes' }
];

const places = [
  {
    name: 'The Old Town Antiques',
    address: '123 Royal Mile, Edinburgh',
    phone: '0131-555-1234',
    email: 'info@oldtownantiques.com',
    website: 'https://www.oldtownantiques.com',
    description: 'A treasure trove of 18th and 19th century Scottish furniture and decorative arts.',
    specialties: 'Scottish antiques, silver, and ceramics',
    opening_hours: 'Mon-Sat: 10am-5pm, Sun: 12pm-4pm',
    lat: 55.9508,
    lng: -3.1877,
    type_id: 1,
    price_range: '£££'
  },
  {
    name: 'Edinburgh Auction Rooms',
    address: '45 New Town Street, Edinburgh',
    phone: '0131-555-5678',
    email: 'bids@edinburghauction.com',
    website: 'https://www.edinburghauction.com',
    description: 'Edinburgh\'s premier auction house for antiques, fine art, and collectibles.',
    specialties: 'Fine art, jewelry, and furniture auctions',
    opening_hours: 'Viewing: Tue-Fri: 10am-4pm, Auctions: Saturdays from 11am',
    lat: 55.9585,
    lng: -3.1924,
    type_id: 2,
    price_range: '££££'
  },
  {
    name: 'Leith Antiquarian Books',
    address: '78 The Shore, Leith, Edinburgh',
    phone: '0131-555-9012',
    email: 'books@leithantiquarian.com',
    website: 'https://www.leithantiquarian.com',
    description: 'Specializing in rare Scottish literature, maps, and manuscripts.',
    specialties: 'Rare books, first editions, and maps',
    opening_hours: 'Tue-Sat: 10am-5:30pm',
    lat: 55.9769,
    lng: -3.1707,
    type_id: 3,
    price_range: '££'
  },
  {
    name: 'Stockbridge Vintage Records',
    address: '22 St. Stephen Street, Edinburgh',
    phone: '0131-555-3456',
    email: 'hello@stockbridgevinyl.com',
    website: 'https://www.stockbridgevinyl.com',
    description: 'Edinburgh\'s best collection of rare and vintage vinyl records.',
    specialties: 'Vinyl records, music memorabilia',
    opening_hours: 'Mon-Sat: 11am-6pm, Sun: 12pm-5pm',
    lat: 55.9598,
    lng: -3.2077,
    type_id: 4,
    price_range: '££'
  },
  {
    name: 'Morningside Vintage',
    address: '104 Morningside Road, Edinburgh',
    phone: '0131-555-7890',
    email: 'style@morningsidevintage.com',
    website: 'https://www.morningsidevintageshop.com',
    description: 'Curated vintage clothing and accessories from the 1920s to the 1980s.',
    specialties: 'Vintage clothing, accessories, and textiles',
    opening_hours: 'Mon-Sat: 10am-5:30pm',
    lat: 55.9327,
    lng: -3.2092,
    type_id: 5,
    price_range: '££'
  },
  {
    name: 'Edinburgh Antiques & Collectors Fair',
    address: 'Assembly Rooms, 54 George Street, Edinburgh',
    phone: '0131-555-2468',
    email: 'info@edinburghfair.org',
    website: 'https://www.edinburghfair.org',
    description: 'Monthly fair featuring over 50 dealers from across Scotland.',
    specialties: 'Wide range of antiques and collectibles',
    opening_hours: 'First Saturday of each month: 10am-4pm',
    lat: 55.9532,
    lng: -3.1993,
    type_id: 6,
    price_range: '£-£££'
  }
];

async function main() {
  try {
    // Connect to the database
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
    
    console.log('Connected to database, initializing schema...');
    
    // Initialize schema
    await db.exec(`
      PRAGMA journal_mode = WAL;
      
      CREATE TABLE IF NOT EXISTS place_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT
      );
      
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
      );
      
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
      );
      
      CREATE TABLE IF NOT EXISTS online_sales_links (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        place_id INTEGER NOT NULL,
        platform_name TEXT NOT NULL,
        url TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (place_id) REFERENCES places(id) ON DELETE CASCADE
      );
    `);
    
    console.log('Schema initialized, seeding data...');
    
    // Seed place types
    for (const placeType of placeTypes) {
      try {
        await db.run(
          'INSERT INTO place_types (name, description) VALUES (?, ?)',
          [placeType.name, placeType.description]
        );
        console.log(`Added place type: ${placeType.name}`);
      } catch (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          console.log(`Place type already exists: ${placeType.name}`);
        } else {
          throw err;
        }
      }
    }
    
    // Seed places
    for (const place of places) {
      try {
        await db.run(`
          INSERT INTO places (
            name, address, phone, email, website, description, 
            specialties, opening_hours, lat, lng, type_id, price_range
          ) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          place.name,
          place.address,
          place.phone,
          place.email,
          place.website,
          place.description,
          place.specialties,
          place.opening_hours,
          place.lat,
          place.lng,
          place.type_id,
          place.price_range
        ]);
        console.log(`Added place: ${place.name}`);
      } catch (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          console.log(`Place already exists: ${place.name}`);
        } else {
          console.error(`Error adding place ${place.name}:`, err.message);
        }
      }
    }
    
    // Add sample opening hours for each place
    for (const place of places) {
      // Find the place ID
      const placeRecord = await db.get('SELECT id FROM places WHERE name = ?', [place.name]);
      if (!placeRecord) continue;
      
      const placeId = placeRecord.id;
      
      // Add standard opening hours (closed on Sunday, open Mon-Sat)
      const openingHours = [
        // Sunday - closed
        {
          place_id: placeId,
          day_of_week: 0, // Sunday
          open_time: null,
          close_time: null,
          is_closed: 1,
          is_by_appointment: 0,
          notes: 'Closed on Sundays'
        },
        // Monday to Friday (9am-5pm)
        ...Array.from({length: 5}, (_, i) => ({
          place_id: placeId,
          day_of_week: i + 1, // Monday = 1, Friday = 5
          open_time: formatTimeInto24H(9),
          close_time: formatTimeInto24H(17),
          is_closed: 0,
          is_by_appointment: 0,
          notes: null
        })),
        // Saturday (10am-4pm)
        {
          place_id: placeId,
          day_of_week: 6, // Saturday
          open_time: formatTimeInto24H(10),
          close_time: formatTimeInto24H(16),
          is_closed: 0,
          is_by_appointment: 0,
          notes: null
        }
      ];
      
      // Insert the opening hours
      for (const hour of openingHours) {
        await db.run(
          `INSERT INTO opening_hours (place_id, day_of_week, open_time, close_time, is_closed, is_by_appointment, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [hour.place_id, hour.day_of_week, hour.open_time, hour.close_time, hour.is_closed, hour.is_by_appointment, hour.notes]
        );
      }
      
      // Add sample online sales links for one place (The Old Town Antiques)
      if (place.name === 'The Old Town Antiques') {
        const onlineSalesLinks = [
          {
            place_id: placeId,
            platform_name: 'eBay',
            url: 'https://www.ebay.co.uk/str/oldtownantiques',
            description: 'Furniture and decorative items'
          },
          {
            place_id: placeId,
            platform_name: 'Etsy',
            url: 'https://www.etsy.com/shop/OldTownAntiquesEdin',
            description: 'Smaller collectibles and vintage items'
          }
        ];
        
        // Insert the online sales links
        for (const link of onlineSalesLinks) {
          await db.run(
            `INSERT INTO online_sales_links (place_id, platform_name, url, description)
             VALUES (?, ?, ?, ?)`,
            [link.place_id, link.platform_name, link.url, link.description]
          );
        }
      }
    }
    
    console.log('Database seeding complete!');
    await db.close();
    
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

main();

import { getDb } from './db';
import { initializeDatabase } from './schema';

export async function seedDatabase() {
  // Initialize the schema first
  const db = await initializeDatabase();

  // Neighborhoods have been removed from the app

  // Create place types
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

  for (const pt of placeTypes) {
    try {
      await db.run('INSERT INTO place_types (name, description) VALUES (?, ?)', pt.name, pt.description);
    } catch (error) {
      console.log(`Skipping duplicate place type: ${pt.name}`);
    }
  }

  // Sample places data
  const places = [
    {
      name: 'Georgian Antiques',
      address: '10 Pattison Street, Leith, Edinburgh EH6 7HF',
      phone: '0131 553 7286',
      email: 'info@georgianantiques.net',
      website: 'https://www.georgianantiques.net/',
      description: 'One of the largest antique warehouses in Britain with over 50,000 items across two floors.',
      specialties: 'Georgian, Victorian and Edwardian furniture, lighting, and decorative items',
      opening_hours: 'Mon-Fri: 10:00-17:00, Sat: 10:00-16:00, Sun: Closed',
      lat: 55.9757,
      lng: -3.1776,
      type_id: 1, // Antique Shop
      price_range: '£££'
    },
    {
      name: 'Lyon & Turnbull',
      address: '33 Broughton Place, Edinburgh EH1 3RR',
      phone: '0131 557 8844',
      email: 'info@lyonandturnbull.com',
      website: 'https://www.lyonandturnbull.com/',
      description: 'Scotland\'s oldest auction house founded in 1826, now specializing in fine art and antiques.',
      specialties: 'Fine art, jewelry, decorative arts, Scottish antiques, Asian art',
      opening_hours: 'Mon-Fri: 9:00-17:00, Viewings by appointment',
      lat: 55.9586,
      lng: -3.1890,
      type_id: 2, // Auction House
      price_range: '££££'
    },
    {
      name: 'Armchair Books',
      address: '72-74 West Port, Edinburgh EH1 2LE',
      phone: '0131 229 5927',
      email: 'info@armchairbooks.co.uk',
      website: 'https://www.armchairbooks.co.uk/',
      description: 'A charming second-hand bookshop with floor to ceiling shelves and a great selection of rare books.',
      specialties: 'Rare books, first editions, Scottish literature, philosophy',
      opening_hours: 'Mon-Sat: 10:00-18:30, Sun: 12:00-18:00',
      lat: 55.9467,
      lng: -3.1986,
      type_id: 3, // Second-hand Book Shop
      price_range: '££'
    },
    {
      name: 'VoxBox Music',
      address: '21 St Stephen Street, Edinburgh EH3 5AN',
      phone: '0131 629 6775',
      email: 'contact@voxboxmusic.co.uk',
      website: 'https://www.voxboxmusic.co.uk/',
      description: 'Independent record store specializing in new and second-hand vinyl.',
      specialties: 'Vinyl records, indie music, classic rock, jazz, soul',
      opening_hours: 'Mon-Sat: 10:00-18:00, Sun: 12:00-17:00',
      lat: 55.9572,
      lng: -3.2089,
      type_id: 4, // Record Shop
      price_range: '££'
    },
    {
      name: 'Armstrong\'s Vintage',
      address: '83 Grassmarket, Edinburgh EH1 2HJ',
      phone: '0131 220 5557',
      email: 'info@armstrongsvintage.co.uk',
      website: 'https://www.armstrongsvintage.co.uk/',
      description: 'Edinburgh\'s oldest vintage clothing store, operating since 1840.',
      specialties: 'Vintage clothing from 1920s-1990s, accessories, costumes',
      opening_hours: 'Mon-Sat: 10:00-18:00, Sun: 11:00-17:00',
      lat: 55.9471,
      lng: -3.1972,
      type_id: 5, // Vintage Clothing Shop
      price_range: '££'
    },
    {
      name: 'Edinburgh Antiques & Collectors Fair',
      address: 'Royal Highland Centre, Ingliston, Edinburgh EH28 8NB',
      phone: '01636 702326',
      email: 'info@antiquesfairs.com',
      website: 'https://www.antiquesfairs.com/',
      description: 'One of Scotland\'s largest antiques fairs with over 300 exhibitors.',
      specialties: 'Furniture, ceramics, glass, silver, jewelry, art, collectibles',
      opening_hours: 'Check website for dates. Usually 10:00-16:30',
      lat: 55.9422,
      lng: -3.3686,
      type_id: 6, // Antique Fair
      price_range: '£-£££'
    },
    {
      name: 'McNaughtan\'s Bookshop',
      address: '3a-4a Haddington Place, Edinburgh EH7 4AE',
      phone: '0131 556 5897',
      email: 'info@mcnaughtansbookshop.com',
      website: 'https://www.mcnaughtansbookshop.com/',
      description: 'Scotland\'s oldest antiquarian bookshop established in 1957.',
      specialties: 'Antiquarian books, Scottish history, literature, fine bindings',
      opening_hours: 'Tue-Sat: 11:00-17:00, Sun-Mon: Closed',
      lat: 55.9579,
      lng: -3.1818,
      type_id: 3, // Second-hand Book Shop
      price_range: '££'
    },
    {
      name: 'Miss Katie Cupcake',
      address: '53 Cockburn Street, Edinburgh EH1 1BS',
      phone: '0131 629 0809',
      email: 'hello@misskatiescupcake.co.uk',
      website: 'https://www.misskatiescupcake.co.uk/',
      description: 'Boutique selling vintage-inspired jewelry and unique gifts.',
      specialties: 'Handmade jewelry, vintage homewares, accessories',
      opening_hours: 'Mon-Sat: 10:00-18:00, Sun: 11:00-17:00',
      lat: 55.9509,
      lng: -3.1891,
      type_id: 5, // Vintage Clothing Shop (closest match)
      price_range: '££'
    },
    {
      name: 'Mr Wood\'s Fossils',
      address: '5 Cowgatehead, Edinburgh EH1 1JY',
      phone: '0131 220 1344',
      email: 'fossil@woodsfossils.com',
      website: 'https://www.mrwoodsfossils.co.uk/',
      description: 'Specialist shop selling fossils, minerals, and meteorites since 1987.',
      specialties: 'Fossils, minerals, crystals, meteorites',
      opening_hours: 'Mon-Sat: 10:00-17:30, Sun: 11:00-17:00',
      lat: 55.9477,
      lng: -3.1943,
      type_id: 1, // Antique Shop (closest match)
      price_range: '£-£££'
    }
  ];

  for (const place of places) {
    try {
      await db.run(`
        INSERT INTO places (
          name, address, phone, email, website, description, 
          specialties, opening_hours, lat, lng, type_id, price_range
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        place.name, place.address, place.phone, place.email,
        place.website, place.description, place.specialties,
        place.opening_hours, place.lat, place.lng,
        place.type_id, place.price_range || null
      );
    } catch (error) {
      console.log(`Error inserting place: ${place.name}`, error);
    }
  }

  console.log('Database seeded with sample data');
}

// Close the database connection
// Not needed with better-sqlite3 as it closes automatically when the program exits

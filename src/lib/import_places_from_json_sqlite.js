const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Path to your SQLite database
const dbPath = path.join(__dirname, '../data/edinburgh-antiques.db');
const jsonPath = path.join(__dirname, '../../edinburgh_update_2.json');

// Best-guess mapping from CSV Category to DB place type name
const CATEGORY_MAP = {
  'Antique Shop': 'Antique Shop',
  'Antiques': 'Antique Shop',
  'Auction House': 'Auction House',
  'Auctioneers': 'Auctioneers',
  'Book Shop': 'Book Shop',
  'Charity Shop': 'Charity Shop',
  'Furniture Shop': 'Furniture Shop',
  'General Antiques': 'Antique Shop',
  'Record Shop': 'Record Shop',
  'Vintage Clothing': 'Vintage Clothing',
};

function combineAddress(record) {
  return [
    record["Address Line 1"],
    record["Address Line 2"],
    record["City/Town"],
    record["Postcode"]
  ].filter(Boolean).join(', ');
}

function getPlaceTypeMap(db) {
  return new Promise((resolve, reject) => {
    db.all('SELECT id, name FROM place_types', (err, rows) => {
      if (err) return reject(err);
      const map = {};
      for (const row of rows) {
        map[row.name.trim()] = row.id;
      }
      resolve(map);
    });
  });
}

function getExistingSet(db) {
  return new Promise((resolve, reject) => {
    db.all('SELECT name, address FROM places', (err, rows) => {
      if (err) return reject(err);
      const set = new Set(rows.map(r => (r.name + '|' + (r.address.split(',').pop() || '')).toLowerCase()));
      resolve(set);
    });
  });
}

async function main() {
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const db = new sqlite3.Database(dbPath);
  const placeTypeMap = await getPlaceTypeMap(db);
  const existingSet = await getExistingSet(db);

  let toImport = [];
  let skipped = [];
  let ambiguous = [];

  for (const rec of data) {
    if (!rec.Name || !rec.Postcode) {
      skipped.push({ reason: 'Missing Name or Postcode', rec });
      continue;
    }
    const dedupKey = (rec.Name + '|' + rec.Postcode).toLowerCase();
    if (existingSet.has(dedupKey)) {
      skipped.push({ reason: 'Duplicate', rec });
      continue;
    }
    const typeName = CATEGORY_MAP[rec.Category?.trim() || ''];
    const typeId = placeTypeMap[typeName];
    if (!typeId) {
      ambiguous.push({ reason: 'Unknown category', rec });
      continue;
    }
    const address = combineAddress(rec);
    const place = {
      name: rec.Name,
      address,
      phone: rec.Phone || null,
      email: rec.Email || null,
      website: rec.Website || null,
      description: '',
      specialties: '',
      opening_hours: '',
      lat: '',
      lng: '',
      type_id: typeId,
      price_range: null,
    };
    toImport.push(place);
  }

  console.log('Import Summary:');
  console.log('  Ready to import:', toImport.length);
  console.log('  Skipped:', skipped.length);
  console.log('  Ambiguous:', ambiguous.length);
  if (ambiguous.length > 0) {
    console.log('Ambiguous entries:');
    ambiguous.forEach(entry => console.log(entry));
  }

  // Uncomment below to actually import
  // for (const place of toImport) {
  //   await new Promise((resolve, reject) => {
  //     db.run(`
  //       INSERT INTO places (name, address, phone, email, website, description, specialties, opening_hours, lat, lng, type_id, price_range)
  //       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  //     `,
  //       [
  //         place.name,
  //         place.address,
  //         place.phone,
  //         place.email,
  //         place.website,
  //         place.description,
  //         place.specialties,
  //         place.opening_hours,
  //         place.lat,
  //         place.lng,
  //         place.type_id,
  //         place.price_range
  //       ],
  //       (err) => err ? reject(err) : resolve()
  //     );
  //   });
  // }
  db.close();
}

main().catch(console.error);

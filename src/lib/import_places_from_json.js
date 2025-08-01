const fs = require('fs');
const path = require('path');
const { getDb } = require('./db');

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

async function getPlaceTypeMap(db) {
  const rows = await db.all('SELECT id, name FROM place_types');
  const map = {};
  for (const row of rows) {
    map[row.name.trim()] = row.id;
  }
  return map;
}

function combineAddress(record) {
  return [
    record["Address Line 1"],
    record["Address Line 2"],
    record["City/Town"],
    record["Postcode"]
  ].filter(Boolean).join(', ');
}

async function main() {
  const jsonPath = path.join(process.cwd(), 'edinburgh_update_2.json');
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const db = await getDb();
  const placeTypeMap = await getPlaceTypeMap(db);
  const existing = await db.all('SELECT name, address FROM places');
  const existingSet = new Set(existing.map(r => (r.name + '|' + (r.address.split(',').pop() || '')).toLowerCase()));

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
  //   await db.run(`
  //     INSERT INTO places (name, address, phone, email, website, description, specialties, opening_hours, lat, lng, type_id, price_range)
  //     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  //   `,
  //     place.name,
  //     place.address,
  //     place.phone,
  //     place.email,
  //     place.website,
  //     place.description,
  //     place.specialties,
  //     place.opening_hours,
  //     place.lat,
  //     place.lng,
  //     place.type_id,
  //     place.price_range
  //   );
  // }
  await db.close();
}

main().catch(console.error);

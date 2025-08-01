const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function runMigration() {
  console.log('Starting address fields migration...');
  
  // Open database connection
  const db = await open({
    filename: path.join(process.cwd(), 'data', 'edinburgh-antiques.db'),
    driver: sqlite3.Database
  });
  
  try {
    // Get current schema to check if columns exist
    const tableInfo = await db.all("PRAGMA table_info(places);");
    const columns = tableInfo.map((column) => column.name);
    
    // New address fields to add
    const addressFields = [
      { name: 'address_shop_name', type: 'TEXT' },
      { name: 'address_street', type: 'TEXT' },
      { name: 'address_area', type: 'TEXT' },
      { name: 'address_city', type: 'TEXT', default: "'Edinburgh'" },
      { name: 'address_postcode', type: 'TEXT' }
    ];
    
    // Add each new column if it doesn't exist
    let columnsAdded = 0;
    for (const field of addressFields) {
      if (!columns.includes(field.name)) {
        console.log(`Adding ${field.name} column to places table`);
        let sql = `ALTER TABLE places ADD COLUMN ${field.name} ${field.type}`;
        if (field.default) {
          sql += ` DEFAULT ${field.default}`;
        }
        await db.exec(sql);
        columnsAdded++;
      } else {
        console.log(`Column ${field.name} already exists`);
      }
    }
    
    // If we added any new columns, try to parse existing address data
    if (columnsAdded > 0) {
      console.log('Attempting to migrate existing address data to new fields...');
      
      // Get all places with their addresses
      const places = await db.all('SELECT id, address FROM places WHERE address IS NOT NULL AND address != ""');
      
      // Process each place
      let migratedCount = 0;
      for (const place of places) {
        console.log(`Processing address for place ID ${place.id}: ${place.address}`);
        
        // Simple parsing - this won't be perfect but can handle basic formats
        const addressParts = parseAddress(place.address);
        
        // Update the place with parsed address components
        if (addressParts) {
          await db.run(`
            UPDATE places SET
              address_shop_name = ?,
              address_street = ?,
              address_area = ?,
              address_city = ?,
              address_postcode = ?
            WHERE id = ?
          `, 
          addressParts.shopName || null,
          addressParts.street || null,
          addressParts.area || null,
          addressParts.city || 'Edinburgh',
          addressParts.postcode || null,
          place.id);
          
          migratedCount++;
        }
      }
      
      console.log(`Successfully migrated ${migratedCount} of ${places.length} addresses`);
    }
    
    console.log('Address fields migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await db.close();
  }
}

// Function to parse an address string into components
function parseAddress(addressStr) {
  if (!addressStr) return null;
  
  // UK postcodes typically follow patterns like EH1 1AB
  const postcodeRegex = /\b([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})\b/i;
  const postcodeMatch = addressStr.match(postcodeRegex);
  
  let postcode = null;
  let remaining = addressStr;
  
  // Extract postcode if found
  if (postcodeMatch) {
    postcode = postcodeMatch[0].trim();
    remaining = addressStr.replace(postcodeRegex, '').trim();
  }
  
  // Attempt to parse the rest
  const parts = remaining.split(',').map(p => p.trim());
  
  let shopName = null;
  let street = null;
  let area = null; 
  let city = 'Edinburgh'; // Default city
  
  if (parts.length >= 3) {
    // If we have at least 3 parts, assume shop name, street, area
    shopName = parts[0];
    street = parts[1];
    area = parts[2];
    
    // Check if any part looks like "Edinburgh" to extract city
    for (let i = 2; i < parts.length; i++) {
      if (parts[i].toLowerCase().includes('edinburgh')) {
        city = 'Edinburgh';
        // If Edinburgh is at index 2, it's the area
        if (i === 2) {
          area = null;
        }
        break;
      }
    }
  } else if (parts.length === 2) {
    // If we have 2 parts, assume shop name and street
    shopName = parts[0];
    street = parts[1];
  } else if (parts.length === 1) {
    // If just one part, assume it's all street
    street = parts[0];
  }
  
  return {
    shopName,
    street,
    area,
    city,
    postcode
  };
}

// Run the migration
runMigration()
  .then(() => {
    console.log('Migration script completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('Migration script failed:', err);
    process.exit(1);
  });

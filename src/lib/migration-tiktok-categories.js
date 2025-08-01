const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function runMigration() {
  console.log('Starting TikTok and category name migration...');
  
  // Open database connection
  const db = await open({
    filename: path.join(process.cwd(), 'data', 'edinburgh-antiques.db'),
    driver: sqlite3.Database
  });
  
  try {
    // Part 1: Add TikTok column to places table
    console.log('Checking if TikTok column exists...');
    const tableInfo = await db.all("PRAGMA table_info(places);");
    const columns = tableInfo.map((column) => column.name);
    
    if (!columns.includes('tiktok_url')) {
      console.log('Adding tiktok_url column to places table');
      await db.exec(`ALTER TABLE places ADD COLUMN tiktok_url TEXT;`);
    } else {
      console.log('TikTok column already exists');
    }
    
    // Part 2: Update category names
    console.log('Updating category names...');
    const categoryUpdates = [
      { old: 'Vintage Clothing', new: 'Clothing' },
      { old: 'Antique Shop', new: 'Antiques' },
      { old: 'Auction House', new: 'Auctioneers' },
      { old: 'Book Shop', new: 'Books' },
      { old: 'Furniture Shop', new: 'Furniture' },
      { old: 'Record Shop', new: 'Records' }
    ];
    
    for (const category of categoryUpdates) {
      console.log(`Updating "${category.old}" to "${category.new}"`);
      const result = await db.run(
        'UPDATE place_types SET name = ? WHERE name = ?',
        category.new, category.old
      );
      
      if (result.changes > 0) {
        console.log(`Updated ${result.changes} row(s)`);
      } else {
        console.log('No matching category found');
      }
    }
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await db.close();
  }
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

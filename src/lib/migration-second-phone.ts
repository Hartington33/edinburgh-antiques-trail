// Migration script to add second_phone column to places table
import { getDb } from './db';

async function addSecondPhoneColumn() {
  const db = await getDb();
  
  console.log('Checking if second_phone column exists...');
  
  // Get current schema for places table
  const tableInfo = await db.all("PRAGMA table_info(places);");
  const columns = tableInfo.map((column) => column.name);
  
  // Add second_phone column if it doesn't exist
  if (!columns.includes('second_phone')) {
    console.log('Adding column: second_phone to places table');
    await db.exec(`ALTER TABLE places ADD COLUMN second_phone TEXT;`);
    console.log('Successfully added second_phone column');
  } else {
    console.log('Column second_phone already exists');
  }
  
  console.log('Migration completed');
}

// Run this function
addSecondPhoneColumn()
  .then(() => console.log('Migration completed successfully'))
  .catch(err => console.error('Migration failed:', err))
  .finally(() => process.exit());

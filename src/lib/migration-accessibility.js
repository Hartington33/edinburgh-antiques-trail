// Migration script to add accessibility columns to places table
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

// Get database path - matches the one in db.ts
const path = require('path');
const fs = require('fs');

// Ensure the data directory exists
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const DB_PATH = path.join(dataDir, 'edinburgh-antiques.db');

async function addAccessibilityColumns() {
  // Open database connection
  const db = await open({
    filename: DB_PATH,
    driver: sqlite3.Database
  });
  
  console.log('Checking if accessibility columns exist...');
  
  // Get current schema for places table
  const tableInfo = await db.all("PRAGMA table_info(places);");
  const columns = tableInfo.map((column) => column.name);
  
  // Define the new columns we want to add
  const columnsToAdd = [
    'has_disabled_access',
    'has_toilet_facilities',
    'trade_associations'
  ];
  
  // Add each column if it doesn't exist
  const addedColumns = [];
  for (const column of columnsToAdd) {
    if (!columns.includes(column)) {
      console.log(`Adding column: ${column} to places table`);
      
      // Add boolean columns (INTEGER 0/1 in SQLite)
      if (column === 'has_disabled_access' || column === 'has_toilet_facilities') {
        await db.exec(`ALTER TABLE places ADD COLUMN ${column} INTEGER DEFAULT 0;`);
      } else {
        // For text columns
        await db.exec(`ALTER TABLE places ADD COLUMN ${column} TEXT;`);
      }
      
      addedColumns.push(column);
    }
  }
  
  if (addedColumns.length > 0) {
    console.log(`Successfully added ${addedColumns.length} columns:`, addedColumns);
  } else {
    console.log('All columns already exist, no changes needed');
  }
  
  await db.close();
  console.log('Migration completed');
}

// Run this function
addAccessibilityColumns()
  .then(() => console.log('Migration completed successfully'))
  .catch(err => console.error('Migration failed:', err));

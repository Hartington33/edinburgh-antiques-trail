// Use correct path to db module
const path = require('path');
const { getDb } = require(path.join(__dirname, 'db'));

async function createSecondPhoneField() {
  // Connect to the database
  const db = await getDb();

  console.log('Adding second_phone field to places table...');

  try {
    // Check if column exists first to avoid errors
    const tableInfo = await db.all("PRAGMA table_info(places)");
    const hasSecondPhone = tableInfo.some(col => col.name === 'second_phone');
    
    if (!hasSecondPhone) {
      // Add the new column
      await db.run('ALTER TABLE places ADD COLUMN second_phone TEXT');
      console.log('Successfully added second_phone field to places table');
    } else {
      console.log('second_phone field already exists in places table');
    }
  } catch (error) {
    console.error('Error adding second_phone field:', error);
  } finally {
    await db.close();
  }
}

// Run the migration
createSecondPhoneField()
  .then(() => console.log('Migration completed'))
  .catch(err => console.error('Migration failed:', err));

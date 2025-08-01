// Migration script to add social media columns
const { getDb } = require('./db');

async function addSocialMediaColumns() {
  const db = await getDb();
  
  console.log('Checking if social media columns exist...');
  
  // Get current schema for places table
  const tableInfo = await db.all("PRAGMA table_info(places);");
  const columns = tableInfo.map((column) => column.name);
  
  // Add each social media column if it doesn't exist
  const socialMediaColumns = [
    'facebook_url', 
    'instagram_url', 
    'pinterest_url', 
    'twitter_url', 
    'youtube_url', 
    'snapchat_url'
  ];
  
  for (const column of socialMediaColumns) {
    if (!columns.includes(column)) {
      console.log(`Adding column: ${column} to places table`);
      await db.exec(`ALTER TABLE places ADD COLUMN ${column} TEXT;`);
    } else {
      console.log(`Column ${column} already exists`);
    }
  }
  
  console.log('Social media columns migration completed');
}

// Run this function
addSocialMediaColumns()
  .then(() => console.log('Migration completed successfully'))
  .catch(err => console.error('Migration failed:', err))
  .finally(() => process.exit());

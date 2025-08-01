import { resetDatabase } from '../src/lib/schema';
import { seedDatabase } from '../src/lib/seed';

async function resetAndSeedDatabase() {
  console.log('Resetting and reseeding database...');
  try {
    // First reset the database (drops all tables and recreates them)
    await resetDatabase();
    
    // Then seed it with our updated data
    await seedDatabase();
    
    console.log('Database has been reset and seeded successfully!');
  } catch (error) {
    console.error('Error resetting database:', error);
    process.exit(1);
  }
}

// Run the function
resetAndSeedDatabase();

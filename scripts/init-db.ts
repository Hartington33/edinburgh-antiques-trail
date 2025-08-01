import { initializeDatabase, resetDatabase } from '../src/lib/schema';
import { seedDatabase } from '../src/lib/seed';

async function main() {
  console.log('Resetting database...');
  await resetDatabase();
  
  console.log('Seeding database with initial data...');
  await seedDatabase();
  
  console.log('Database initialization complete!');
  process.exit(0);
}

main().catch(error => {
  console.error('Error initializing database:', error);
  process.exit(1);
});

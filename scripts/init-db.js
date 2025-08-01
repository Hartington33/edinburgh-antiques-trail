// JavaScript version of the init-db script
const { execSync } = require('child_process');

try {
  console.log('Building the database initialization script...');
  // First compile the TypeScript file to JavaScript
  execSync('npx tsc --esModuleInterop --skipLibCheck scripts/init-db.ts --outDir scripts/dist');
  
  console.log('Running the database initialization...');
  // Then run the compiled JavaScript file
  execSync('node scripts/dist/init-db.js', { stdio: 'inherit' });
  
  console.log('Database initialization complete!');
} catch (error) {
  console.error('Error during database initialization:', error.message);
  process.exit(1);
}

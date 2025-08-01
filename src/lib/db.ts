import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import fs from 'fs';

// Ensure the data directory exists
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'edinburgh-antiques.db');

// Create a database connection factory function
export async function getDb() {
  // This prevents SQLite busy errors by using the same connection for each request
  if (process.env.NODE_ENV === 'development') {
    if (!global.sqlite) {
      const db = await open({
        filename: dbPath,
        driver: sqlite3.Database
      });
      await db.exec('PRAGMA journal_mode = WAL;');
      global.sqlite = db;
    }
    return global.sqlite;
  }
  
  // For production, create a new connection
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });
  await db.exec('PRAGMA journal_mode = WAL;');
  return db;
}

// Add global type for TypeScript
declare global {
  var sqlite: any;
}

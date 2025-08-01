// Update database schema to support hierarchical specialties
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(process.cwd(), 'data', 'edinburgh-antiques.db');
console.log(`Using database at: ${dbPath}`);

const db = new sqlite3.Database(dbPath);

async function updateSchema() {
  try {
    console.log("===== UPDATING SPECIALTIES SCHEMA =====");

    // Start a transaction
    await run('BEGIN TRANSACTION');
    
    // Step 1: Check if parent_id column already exists
    console.log("\nChecking if parent_id column exists in specialties table...");
    const tableInfo = await all("PRAGMA table_info(specialties)");
    const hasParentId = tableInfo.some(col => col.name === 'parent_id');
    
    if (!hasParentId) {
      console.log("Adding parent_id column to specialties table...");
      await run(`ALTER TABLE specialties ADD COLUMN parent_id INTEGER NULL`);
      console.log("✅ Added parent_id column successfully");
      
      // Add foreign key constraint in a roundabout way (SQLite limitations)
      console.log("Creating trigger for foreign key integrity...");
      await run(`
        CREATE TRIGGER fk_specialties_parent_id
        BEFORE INSERT ON specialties
        FOR EACH ROW
        WHEN NEW.parent_id IS NOT NULL
        BEGIN
          SELECT CASE WHEN NOT EXISTS (
            SELECT 1 FROM specialties WHERE id = NEW.parent_id
          )
          THEN RAISE(ABORT, 'Foreign key constraint failed: parent_id must reference a valid specialty')
          END;
        END
      `);
      console.log("✅ Added foreign key trigger");
    } else {
      console.log("✅ parent_id column already exists");
    }
    
    // Step 2: Create specialty_searches table for analytics if it doesn't exist
    console.log("\nChecking if specialty_searches table exists...");
    const tables = await all("SELECT name FROM sqlite_master WHERE type='table' AND name='specialty_searches'");
    
    if (tables.length === 0) {
      console.log("Creating specialty_searches table for analytics...");
      await run(`
        CREATE TABLE specialty_searches (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          specialty_id INTEGER NOT NULL,
          search_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          user_ip TEXT NULL,
          session_id TEXT NULL,
          FOREIGN KEY (specialty_id) REFERENCES specialties(id)
        )
      `);
      console.log("✅ Created specialty_searches table");
      
      // Add index for better performance
      await run(`CREATE INDEX idx_specialty_searches_specialty_id ON specialty_searches(specialty_id)`);
      console.log("✅ Added index on specialty_id");
    } else {
      console.log("✅ specialty_searches table already exists");
    }
    
    // Step 3: Create table for specialty requests if it doesn't exist
    console.log("\nChecking if specialty_requests table exists...");
    const requestsTable = await all("SELECT name FROM sqlite_master WHERE type='table' AND name='specialty_requests'");
    
    if (requestsTable.length === 0) {
      console.log("Creating specialty_requests table...");
      await run(`
        CREATE TABLE specialty_requests (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          place_id INTEGER NOT NULL,
          request_text TEXT NOT NULL,
          status TEXT DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          processed_at TIMESTAMP NULL,
          FOREIGN KEY (place_id) REFERENCES places(id)
        )
      `);
      console.log("✅ Created specialty_requests table");
    } else {
      console.log("✅ specialty_requests table already exists");
    }
    
    // Commit transaction
    await run('COMMIT');
    
    console.log("\n===== SCHEMA UPDATE COMPLETE =====");
    console.log("Your database is now ready for hierarchical specialties!");
    
  } catch (error) {
    // Rollback on error
    await run('ROLLBACK');
    console.error("Error updating schema:", error);
  } finally {
    db.close();
  }
}

// Helper functions
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

updateSchema().catch(error => console.error(error));

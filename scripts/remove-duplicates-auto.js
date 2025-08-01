const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database file path
const dbPath = path.join(__dirname, '..', 'data', 'edinburgh-antiques.db');

// Connect to the database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error(`Error opening database: ${err.message}`);
    process.exit(1);
  }
  console.log(`Connected to database: ${dbPath}`);
});

/**
 * Remove a place and all its related data
 */
async function removePlace(placeId) {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Begin transaction
      db.run('BEGIN TRANSACTION', (err) => {
        if (err) {
          reject(err);
          return;
        }
        
        // 1. Delete opening hours for the place
        db.run('DELETE FROM opening_hours WHERE place_id = ?', [placeId], (err) => {
          if (err) {
            db.run('ROLLBACK');
            reject(err);
            return;
          }
          
          // 2. Delete online sales links if they exist
          db.run('DELETE FROM online_sales_links WHERE place_id = ?', [placeId], (err) => {
            if (err) {
              db.run('ROLLBACK');
              reject(err);
              return;
            }
            
            // 3. Finally delete the place
            db.run('DELETE FROM places WHERE id = ?', [placeId], function(err) {
              if (err) {
                db.run('ROLLBACK');
                reject(err);
                return;
              }
              
              // Commit transaction
              db.run('COMMIT', (err) => {
                if (err) {
                  db.run('ROLLBACK');
                  reject(err);
                  return;
                }
                
                resolve(this.changes);
              });
            });
          });
        });
      });
    });
  });
}

/**
 * Get shop details by ID
 */
async function getShopDetails(placeId) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT p.*, pt.name as type_name
       FROM places p
       JOIN place_types pt ON p.type_id = pt.id
       WHERE p.id = ?`,
      [placeId],
      (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(row);
      }
    );
  });
}

/**
 * Count opening hours for a place
 */
async function countOpeningHours(placeId) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT COUNT(*) as count FROM opening_hours WHERE place_id = ?`,
      [placeId],
      (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(row.count);
      }
    );
  });
}

/**
 * Main function to remove duplicates automatically
 */
async function removeDuplicates() {
  try {
    console.log("Automatically removing duplicate shop entries...");
    
    // IDs to keep (always keep the highest ID as it's the most recently imported)
    const duplicateSets = [
      // Alan Day duplicates
      { keep: 17, remove: [7, 12] },
      // Anthony Woodd duplicates
      { keep: 18, remove: [8, 13] },
      // Aquarius duplicates
      { keep: 19, remove: [9, 14] },
      // Armchair Books duplicates
      { keep: 20, remove: [10, 15] },
      // Bowerbird duplicates (keeping both Bowerbird and Bowerbird Antiques as they appear to be separate entities)
      { keep: 21, remove: [11, 16] },
      // Tills Bookshop duplicates
      { keep: 74, remove: [73] }
      // Note: Not removing Goodwins as they have different addresses
      // Note: Not removing Those Were The Days Bridal as it appears to be a separate shop
    ];
    
    // Process each set of duplicates
    for (const set of duplicateSets) {
      const keepId = set.keep;
      const removeIds = set.remove;
      
      // Get details of the shop we're keeping
      const keepShop = await getShopDetails(keepId);
      
      console.log(`\nKeeping shop: ID ${keepId} - ${keepShop.name} (${keepShop.type_name})`);
      
      // Remove each duplicate
      for (const removeId of removeIds) {
        const removeShop = await getShopDetails(removeId);
        if (!removeShop) {
          console.log(`Shop ID ${removeId} not found, skipping.`);
          continue;
        }
        
        console.log(`Removing duplicate: ID ${removeId} - ${removeShop.name} (${removeShop.type_name})`);
        await removePlace(removeId);
        console.log(`Successfully removed ID ${removeId}`);
      }
    }
    
    console.log("\nFinished removing duplicate shops!");
    
  } catch (error) {
    console.error(`Error removing duplicates: ${error.message}`);
  } finally {
    // Close the database connection
    db.close(() => {
      console.log('Database connection closed.');
    });
  }
}

// Run the function
removeDuplicates();

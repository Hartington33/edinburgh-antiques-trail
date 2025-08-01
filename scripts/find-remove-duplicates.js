const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const readline = require('readline');

// Database file path
const dbPath = path.join(__dirname, '..', 'data', 'edinburgh-antiques.db');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Connect to the database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error(`Error opening database: ${err.message}`);
    process.exit(1);
  }
  console.log(`Connected to database: ${dbPath}`);
});

/**
 * Find potential duplicate places based on name similarity
 */
async function findDuplicates() {
  return new Promise((resolve, reject) => {
    // Query to find places with the same name
    const sql = `
      SELECT p1.id as id1, p1.name as name1, p1.address as address1, p1.type_id as type_id1, pt1.name as type_name1,
             p2.id as id2, p2.name as name2, p2.address as address2, p2.type_id as type_id2, pt2.name as type_name2
      FROM places p1
      JOIN places p2 ON LOWER(p1.name) = LOWER(p2.name) AND p1.id < p2.id 
      JOIN place_types pt1 ON p1.type_id = pt1.id
      JOIN place_types pt2 ON p2.type_id = pt2.id
      ORDER BY p1.name
    `;

    db.all(sql, [], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (rows.length === 0) {
        console.log("No exact name duplicates found.");
      } else {
        console.log(`\nFound ${rows.length} potential duplicate places:\n`);
        
        rows.forEach((row, index) => {
          console.log(`${index + 1}. "${row.name1}" appears multiple times:`);
          console.log(`   A. ID: ${row.id1}, Address: ${row.address1}, Type: ${row.type_name1}`);
          console.log(`   B. ID: ${row.id2}, Address: ${row.address2}, Type: ${row.type_name2}`);
          console.log();
        });
      }
      
      // Also check for similar names
      const similarSql = `
        SELECT p1.id, p1.name, p1.address, pt.name as type_name
        FROM places p1
        JOIN place_types pt ON p1.type_id = pt.id
        ORDER BY p1.name
      `;
      
      db.all(similarSql, [], (err, allPlaces) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Find similar names (not exact matches)
        const similarNames = [];
        
        for (let i = 0; i < allPlaces.length - 1; i++) {
          const place1 = allPlaces[i];
          
          for (let j = i + 1; j < allPlaces.length; j++) {
            const place2 = allPlaces[j];
            
            // Skip exact matches (already handled)
            if (place1.name.toLowerCase() === place2.name.toLowerCase()) {
              continue;
            }
            
            // Check if one name contains the other or they're very similar
            const name1 = place1.name.toLowerCase();
            const name2 = place2.name.toLowerCase();
            
            if (name1.includes(name2) || name2.includes(name1) ||
                levenshteinDistance(name1, name2) <= 3) {
              similarNames.push({
                id1: place1.id,
                name1: place1.name,
                address1: place1.address,
                type_name1: place1.type_name,
                id2: place2.id,
                name2: place2.name,
                address2: place2.address,
                type_name2: place2.type_name
              });
            }
          }
        }
        
        if (similarNames.length > 0) {
          console.log(`\nFound ${similarNames.length} places with similar names:\n`);
          
          similarNames.forEach((match, index) => {
            console.log(`${index + 1}. Possible similar names:`);
            console.log(`   A. ID: ${match.id1}, Name: "${match.name1}", Address: ${match.address1}, Type: ${match.type_name1}`);
            console.log(`   B. ID: ${match.id2}, Name: "${match.name2}", Address: ${match.address2}, Type: ${match.type_name2}`);
            console.log();
          });
        }
        
        resolve({ exactDuplicates: rows, similarNames });
      });
    });
  });
}

/**
 * Calculate Levenshtein distance between two strings
 * Used to find similar shop names
 */
function levenshteinDistance(a, b) {
  const matrix = [];

  // Initialize matrix
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

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
 * Ask user which duplicates to remove
 */
async function promptUserToRemoveDuplicates(duplicates) {
  if (duplicates.exactDuplicates.length === 0 && duplicates.similarNames.length === 0) {
    console.log("No duplicates to remove.");
    return;
  }
  
  console.log("\nWould you like to remove any of these potential duplicates? (y/n)");
  
  const answer = await new Promise(resolve => rl.question("", resolve));
  
  if (answer.toLowerCase() !== 'y') {
    console.log("No duplicates will be removed.");
    return;
  }
  
  let allDuplicates = [];
  
  // Add exact duplicates
  duplicates.exactDuplicates.forEach((dup, index) => {
    allDuplicates.push({
      index: index + 1,
      id1: dup.id1,
      name1: dup.name1,
      address1: dup.address1,
      type_name1: dup.type_name1,
      id2: dup.id2,
      name2: dup.name2,
      address2: dup.address2,
      type_name2: dup.type_name2,
      type: 'exact'
    });
  });
  
  // Add similar names
  duplicates.similarNames.forEach((dup, index) => {
    allDuplicates.push({
      index: index + 1 + duplicates.exactDuplicates.length,
      id1: dup.id1,
      name1: dup.name1,
      address1: dup.address1,
      type_name1: dup.type_name1,
      id2: dup.id2,
      name2: dup.name2,
      address2: dup.address2,
      type_name2: dup.type_name2,
      type: 'similar'
    });
  });
  
  for (const duplicate of allDuplicates) {
    console.log(`\nDuplicate ${duplicate.index} (${duplicate.type === 'exact' ? 'Exact match' : 'Similar names'}):`);
    console.log(`A. ID: ${duplicate.id1}, Name: "${duplicate.name1}", Address: ${duplicate.address1}, Type: ${duplicate.type_name1}`);
    console.log(`B. ID: ${duplicate.id2}, Name: "${duplicate.name2}", Address: ${duplicate.address2}, Type: ${duplicate.type_name2}`);
    
    const answer = await new Promise(resolve => 
      rl.question("Remove one? (a/b/s to skip): ", resolve)
    );
    
    if (answer.toLowerCase() === 'a') {
      console.log(`Removing option A (ID: ${duplicate.id1})...`);
      try {
        await removePlace(duplicate.id1);
        console.log("Successfully removed!");
      } catch (error) {
        console.error(`Error removing place: ${error.message}`);
      }
    } else if (answer.toLowerCase() === 'b') {
      console.log(`Removing option B (ID: ${duplicate.id2})...`);
      try {
        await removePlace(duplicate.id2);
        console.log("Successfully removed!");
      } catch (error) {
        console.error(`Error removing place: ${error.message}`);
      }
    } else {
      console.log("Skipped.");
    }
  }
}

/**
 * Main function
 */
async function main() {
  try {
    const duplicates = await findDuplicates();
    await promptUserToRemoveDuplicates(duplicates);
    
    // Close the database connection
    db.close();
    console.log('Database connection closed.');
    rl.close();
    
  } catch (error) {
    console.error(`Error: ${error.message}`);
    db.close();
    rl.close();
    process.exit(1);
  }
}

// Run the main function
main();

// Import remaining specialty categories and subcategories 
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(process.cwd(), 'data', 'edinburgh-antiques.db');
console.log(`Using database at: ${dbPath}`);

const db = new sqlite3.Database(dbPath);

// Second batch of main categories and their subcategories
const specialtyCategories = [
  {
    main: "Prints Photography Art",
    subs: ["Abstract Art", "Advertising Posters", "Aquatint", "Botanical Prints", "Charcoals", 
           "Daguerreotypes", "Drawings", "Etchings", "Lithographs", "Maps", "Oil Paintings", 
           "Pastels", "Photography", "Political Cartoons", "Portraits", "Posters", "Prints", 
           "Scottish Art", "Silhouettes", "Watercolors", "Woodcuts"]
  },
  {
    main: "Books & Ephemera",
    subs: ["Almanacs", "Atlases", "Autographs", "Bibles", "Bookplates", "Children's Books", 
           "Comics", "First Editions", "Illuminated Manuscripts", "Letters", "Limited Editions", 
           "Magazines", "Maps", "Newspapers", "Pamphlets", "Poetry", "Postcards", "Rare Books", 
           "Scottish Literature", "Sheet Music", "Theatre Programs"]
  },
  {
    main: "Lighting",
    subs: ["Art Deco Lamps", "Candelabras", "Candlesticks", "Ceiling Lights", "Chandeliers", 
           "Floor Lamps", "Gas Lamps", "Kerosene Lamps", "Lanterns", "Oil Lamps", 
           "Picture Lights", "Sconces", "Table Lamps", "Wall Lights"]
  },
  {
    main: "Textiles",
    subs: ["Carpets", "Crewelwork", "Damask", "Embroidery", "Lace", "Linens", "Needlework", 
           "Quilts", "Rugs", "Samplers", "Scottish Tartans", "Silk", "Tapestries", "Velvet", "Wool"]
  },
  {
    main: "Asian",
    subs: ["Ceramics", "Carved Ivory", "Furniture", "Jade", "Jewelry", "Lacquerware", "Paintings", 
           "Porcelain", "Scrolls", "Sculptures", "Silk", "Textiles", "Wood Carvings"]
  },
  {
    main: "Jewellery",
    subs: ["Amber", "Art Deco", "Art Nouveau", "Bracelets", "Brooches", "Celtic", "Costume", 
           "Diamonds", "Earrings", "Edwardian", "Engagement Rings", "Georgian", "Gold", "Jade", 
           "Necklaces", "Pearl", "Platinum", "Rings", "Ruby", "Sapphire", "Scottish", 
           "Silver", "Victorian", "Watches"]
  },
  {
    main: "Home Accessories",
    subs: ["Barometers", "Boxes", "Candelabras", "Clocks", "Coasters", "Copper", "Decanters", 
           "Doorknobs", "Doorknockers", "Fireplace Accessories", "Hooks", "Humidors", "Inkwells", 
           "Kitchenalia", "Mirrors", "Picture Frames", "Pillows", "Rugs", "Snuff Boxes", 
           "Trunks", "Vases", "Weather Vanes"]
  },
  {
    main: "Scottish Heritage",
    subs: ["Aberdeen", "Bagpipes", "Celtic", "Clan Items", "Edinburgh", "Glasgow", "Highland", 
           "Inverness", "Jacobite", "Kilts", "Paisley", "Perth", "Quaich", "Royal", "Silverware", 
           "Sporrans", "Tartans"]
  }, 
  {
    main: "Garden & Outdoor",
    subs: ["Benches", "Bird Baths", "Cast Iron", "Fountains", "Garden Furniture", "Garden Tools", 
           "Gates", "Planters", "Statuary", "Stone Carvings", "Sundials", "Urns", "Weather Vanes"]
  }
];

async function importSpecialties() {
  try {
    console.log("===== IMPORTING REMAINING SPECIALTY CATEGORIES =====");

    // Start a transaction
    await run('BEGIN TRANSACTION');
    
    // Check if parent_id column exists
    const tableInfo = await all("PRAGMA table_info(specialties)");
    const hasParentId = tableInfo.some(col => col.name === 'parent_id');
    
    if (!hasParentId) {
      console.log("❌ Error: parent_id column doesn't exist in specialties table!");
      console.log("Please run update-specialties-schema.js first");
      return;
    }
    
    // Store the existing specialties
    console.log("\nFetching existing specialties...");
    const existingSpecialties = await all("SELECT id, name FROM specialties");
    console.log(`Found ${existingSpecialties.length} existing specialties`);
    
    // Import categories
    let importedMainCount = 0;
    let importedSubCount = 0;
    
    for (const category of specialtyCategories) {
      console.log(`\nProcessing category: ${category.main}`);
      
      // Check if main category exists
      const existingMain = existingSpecialties.find(s => 
        s.name.toLowerCase() === category.main.toLowerCase());
      
      let mainCategoryId;
      
      if (existingMain) {
        console.log(`Main category "${category.main}" already exists with ID=${existingMain.id}`);
        mainCategoryId = existingMain.id;
        
        // Update to ensure it has NULL parent_id
        await run("UPDATE specialties SET parent_id = NULL WHERE id = ?", [mainCategoryId]);
      } else {
        // Insert main category
        const result = await run(
          "INSERT INTO specialties (name, description, parent_id) VALUES (?, ?, NULL)",
          [category.main, `${category.main} specialty items`]
        );
        mainCategoryId = result.lastID;
        console.log(`✅ Created main category "${category.main}" with ID=${mainCategoryId}`);
        importedMainCount++;
      }
      
      // Process subcategories
      for (const subName of category.subs) {
        // Check if subcategory exists
        const existingSub = existingSpecialties.find(s => 
          s.name.toLowerCase() === subName.toLowerCase());
        
        if (existingSub) {
          // Update to ensure it has the correct parent_id
          await run(
            "UPDATE specialties SET parent_id = ? WHERE id = ?", 
            [mainCategoryId, existingSub.id]
          );
          console.log(`Updated "${subName}" to have parent category "${category.main}"`);
        } else {
          // Insert subcategory
          const result = await run(
            "INSERT INTO specialties (name, description, parent_id) VALUES (?, ?, ?)",
            [subName, `${subName} (${category.main})`, mainCategoryId]
          );
          console.log(`✅ Created subcategory "${subName}" with ID=${result.lastID}`);
          importedSubCount++;
        }
      }
    }
    
    // Commit transaction
    await run('COMMIT');
    
    console.log("\n===== IMPORT SUMMARY =====");
    console.log(`Imported ${importedMainCount} new main categories`);
    console.log(`Imported ${importedSubCount} new subcategories`);
    
    // Final validation
    const mainCategories = await all("SELECT id, name FROM specialties WHERE parent_id IS NULL");
    console.log(`\nTotal main categories in database: ${mainCategories.length}`);
    
    const subcategories = await all("SELECT id, name FROM specialties WHERE parent_id IS NOT NULL");
    console.log(`Total subcategories in database: ${subcategories.length}`);
    
    console.log("\n===== IMPORT COMPLETED SUCCESSFULLY =====");
    
  } catch (error) {
    // Rollback on error
    await run('ROLLBACK');
    console.error("Error importing specialties:", error);
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

importSpecialties().catch(error => console.error(error));

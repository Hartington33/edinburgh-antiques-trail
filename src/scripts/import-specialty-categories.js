// Import specialty categories and subcategories
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(process.cwd(), 'data', 'edinburgh-antiques.db');
console.log(`Using database at: ${dbPath}`);

const db = new sqlite3.Database(dbPath);

// First batch of main categories and their subcategories
const specialtyCategories = [
  {
    main: "Vintage Clothing",
    subs: ["Bags", "Buttons", "Fans", "Gloves", "Handkerchiefs", "Hatpins", "Hats", "Kilts", "Luggage", 
           "Men's", "Parasols", "Perfume Bottles", "Pocket Watches", "Purses", "Scottish", "Shawls", 
           "Sporrans", "Tweed", "Umbrellas", "Walking Sticks", "Wedding", "Women's", "Wristwatches"]
  },
  {
    main: "Militaria",
    subs: ["Badges", "Equipment", "Ephemera", "Medals", "Memorabilia", "Uniforms", "Weapons"]
  },
  {
    main: "Collectables",
    subs: ["Action Figures", "Advertising Signs", "Autographs", "Cigarette Cards", "Coins", "Dolls", 
           "Ephemera", "Maps", "Model Trains", "Musical Instruments", "Posters", "Postcards", "Sheet Music", 
           "Sports Memorabilia", "Stamps", "Toys", "Vintage Electronics", "Watches"]
  },
  {
    main: "Ceramics Glass Pottery",
    subs: ["Art Glass", "Ceramics", "Crystal", "Decanters", "Decorative Plates", "Earthenware", 
           "Enamelware", "Figurines", "Glassware", "Mauchlinware", "Porcelaine", "Pottery", 
           "Stoneware", "Tableware", "Tartainware", "Tea Sets", "Tiles", "Vases"]
  },
  {
    main: "Silver Gold Metalware",
    subs: ["Beer Steins", "Brassware", "Candlesticks", "Cutlery", "Gold", "Pewter", "Picture Frames", 
           "Platters", "Silver", "Tankards", "Trophies", "Trays", "Vases"]
  },
  {
    main: "Furniture",
    subs: ["Armoires", "Bookcases", "Cabinets", "Chairs", "Chandeliers", "Chests", "Desks", 
           "Dressers", "Floor Lamps", "Grandfather Clocks", "Lanterns", "Mantelpieces", 
           "Oil Lamps", "Sideboards", "Settees", "Sofas", "Stools", "Tables", "Wall Lights"]
  },
  {
    main: "Writing & Desk Accessories",
    subs: ["Blotters", "Desk Accessories", "Desk Sets", "Document Holders", "Fountain Pens", 
           "Inkwells", "Letter Openers", "Paperweights", "Pen Holders", "Pens", "Seals", 
           "Stamp Boxes", "Writing Boxes"]
  },
  {
    main: "Musical Instruments",
    subs: ["Accordions", "Bagpipes", "Brass Instruments", "Drum Kits", "Guitars", "Harps", 
           "Keyboards", "Percussion Instruments", "Pianos", "String Instruments", "Wind Instruments"]
  }
];

async function importSpecialties() {
  try {
    console.log("===== IMPORTING SPECIALTY CATEGORIES =====");

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

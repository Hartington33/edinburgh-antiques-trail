import { getDb } from '../src/lib/db';
import { getOpeningHoursByPlaceId, formatOpeningHoursToString } from '../src/lib/opening-hours-utils';
import { getPlaces } from '../src/lib/data-utils';

async function fixOpeningHours() {
  console.log('🕒 Fixing opening hours format in the database...');
  try {
    const db = await getDb();
    const places = await getPlaces();
    
    console.log(`Processing ${places.length} places...`);
    
    for (const place of places) {
      // Get structured opening hours
      const openingHours = await getOpeningHoursByPlaceId(place.id);
      
      // If there are structured hours, format them correctly and update the text version
      if (openingHours && openingHours.length > 0) {
        const formattedHours = formatOpeningHoursToString(openingHours);
        
        // Update the formatted text in the places table
        await db.run(
          'UPDATE places SET opening_hours = ? WHERE id = ?',
          [formattedHours, place.id]
        );
        
        console.log(`✓ Fixed hours for place ${place.id}: ${place.name}`);
      } else {
        console.log(`⚠ No structured hours found for place ${place.id}: ${place.name}`);
      }
    }
    
    console.log('✅ Opening hours fix complete!');
  } catch (error) {
    console.error('❌ Error fixing opening hours:', error);
  }
}

// Run the function
fixOpeningHours();

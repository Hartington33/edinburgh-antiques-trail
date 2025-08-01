import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    const results: any = { success: true, migrations: [] };
    
    // Get current schema for places table once
    const tableInfo = await db.all("PRAGMA table_info(places);");
    const columns = tableInfo.map((column: any) => column.name);
    
    // Part 1: Social Media Columns and Second Phone Migration
    console.log('Checking if social media columns and second_phone column exist...');
    
    // Create social media columns and second_phone column
    const columnsToAdd = [
      'facebook_url', 
      'instagram_url', 
      'pinterest_url', 
      'twitter_url', 
      'youtube_url',
      'snapchat_url',
      'tiktok_url',
      'second_phone' // Add second_phone column
    ];
    
    const addedColumns: string[] = [];
    
    for (const column of columnsToAdd) {
      if (!columns.includes(column)) {
        console.log(`Adding column: ${column} to places table`);
        await db.exec(`ALTER TABLE places ADD COLUMN ${column} TEXT;`);
        addedColumns.push(column);
      } else {
        console.log(`Column ${column} already exists`);
      }
    }
    
    results.migrations.push({
      name: 'Social Media Columns and Second Phone',
      added: addedColumns,
      existing: columnsToAdd.filter(col => !addedColumns.includes(col))
    });
    
    // Part 2: Fix Day Order Migration
    console.log('Checking and fixing day_of_week values...');
    
    // First check if we need to do this migration
    const invalidDays = await db.get(`
      SELECT DISTINCT day_of_week 
      FROM opening_hours 
      WHERE day_of_week > 6 OR day_of_week < 0
    `);
    
    const fixedPlaces: number[] = [];
    
    if (!invalidDays) {
      console.log('No day_of_week values outside the valid range (0-6) found. Checking ordering...');
      
      // Check if days are in the expected order (0 = Monday, 1 = Tuesday, etc.)
      const places = await db.all(`
        SELECT DISTINCT place_id FROM opening_hours
      `);
      
      for (const place of places) {
        const hours = await db.all(`
          SELECT * FROM opening_hours
          WHERE place_id = ?
          ORDER BY day_of_week
        `, [place.place_id]);
        
        // Fix any misaligned days (ensure 0=Monday through 6=Sunday)
        const daysOfWeek = hours.map((h: any) => h.day_of_week);
        
        // If days don't start with 0 (Monday), we need to normalize them
        if (daysOfWeek.length > 0 && !daysOfWeek.includes(0)) {
          console.log(`Fixing misaligned days for place_id ${place.place_id}`);
          
          // Create a map of current values to expected values
          const dayMap = new Map();
          
          // Normalize the days to ensure 0=Monday through 6=Sunday
          for (let i = 0; i < hours.length; i++) {
            const expectedDay = i % 7;
            dayMap.set(hours[i].day_of_week, expectedDay);
          }
          
          // Update each record with the correct day_of_week
          // Convert Map entries to array to avoid TypeScript iteration errors
          Array.from(dayMap.entries()).forEach(async ([oldDay, newDay]) => {
            await db.run(`
              UPDATE opening_hours
              SET day_of_week = ?
              WHERE place_id = ? AND day_of_week = ?
            `, [newDay, place.place_id, oldDay]);
          });
          
          fixedPlaces.push(place.place_id);
        }
      }
    } else {
      console.log('Found day_of_week values outside the valid range. Normalizing all values...');
      
      // Get all opening hours
      const hours = await db.all(`SELECT * FROM opening_hours ORDER BY place_id, day_of_week`);
      
      // Group by place_id
      const placeGroups = new Map();
      for (const hour of hours) {
        if (!placeGroups.has(hour.place_id)) {
          placeGroups.set(hour.place_id, []);
        }
        placeGroups.get(hour.place_id).push(hour);
      }
      
      // Fix each place's days
      // Convert Map entries to array to avoid TypeScript iteration errors
      for (const [placeId, placeHours] of Array.from(placeGroups.entries())) {
        // Sort by existing day_of_week (even if it's wrong)
        placeHours.sort((a: any, b: any) => a.day_of_week - b.day_of_week);
        
        // Reassign day_of_week values to ensure 0=Monday through 6=Sunday
        for (let i = 0; i < placeHours.length; i++) {
          const expectedDay = i % 7;
          
          await db.run(`
            UPDATE opening_hours
            SET day_of_week = ?
            WHERE id = ?
          `, [expectedDay, placeHours[i].id]);
        }
        
        fixedPlaces.push(placeId);
      }
    }
    
    results.migrations.push({
      name: 'Day Order Fix',
      fixedPlaces,
      totalFixed: fixedPlaces.length
    });
    
    // Part 3: Accessibility & Amenities Fields Migration
    console.log('Checking if accessibility and amenities columns exist...');
    
    // Define the accessibility columns to add
    const accessibilityColumns = [
      { name: 'has_disabled_access', type: 'INTEGER DEFAULT 0' },
      { name: 'has_toilet_facilities', type: 'INTEGER DEFAULT 0' },
      { name: 'trade_associations', type: 'TEXT' }
    ];
    
    const addedAccessibilityColumns: string[] = [];
    
    for (const column of accessibilityColumns) {
      if (!columns.includes(column.name)) {
        console.log(`Adding column: ${column.name} to places table`);
        await db.exec(`ALTER TABLE places ADD COLUMN ${column.name} ${column.type};`);
        addedAccessibilityColumns.push(column.name);
      } else {
        console.log(`Column ${column.name} already exists`);
      }
    }
    
    results.migrations.push({
      name: 'Accessibility & Amenities Fields',
      added: addedAccessibilityColumns,
      existing: accessibilityColumns.map(col => col.name).filter(name => !addedAccessibilityColumns.includes(name))
    });
    
    return NextResponse.json(results);
    
  } catch (error: any) {
    console.error('Migration failed:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Unknown error'
    }, { status: 500 });
  }
}

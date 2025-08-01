import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

interface Specialty {
  id: number;
  name: string;
  description: string;
  parent_id: number | null;
}

interface HierarchicalSpecialty extends Specialty {
  subcategories?: HierarchicalSpecialty[];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const typeId = searchParams.get('type_id');
    const placeId = searchParams.get('place_id');
    const parentId = searchParams.get('parent_id');
    const idsParam = searchParams.get('ids');
    const nameParam = searchParams.getAll('name'); // Get all name parameters
    const mainOnly = searchParams.get('main_only') === 'true';
    const hierarchical = searchParams.get('hierarchical') === 'true';
    const debug = searchParams.get('debug') === 'true';
    
    if (debug) {
      console.log('DEBUG /api/specialties - Parameters:', { 
        typeId, placeId, parentId, idsParam, mainOnly, hierarchical 
      });
    }
    
    const db = await getDb();
    
    // Quick debug to check if Silver specialty exists
    if (debug) {
      const silver = await db.get("SELECT id, name, parent_id FROM specialties WHERE name = 'Silver' OR name LIKE '%Silver%' COLLATE NOCASE");
      console.log('DEBUG Silver specialty:', silver);
      
      if (silver) {
        const silverPlaces = await db.all(
          'SELECT p.id, p.name FROM places p JOIN place_specialties ps ON p.id = ps.place_id WHERE ps.specialty_id = ?',
          [silver.id]
        );
        console.log(`DEBUG Found ${silverPlaces.length} places with Silver specialty ID=${silver.id}:`, 
          silverPlaces.map(p => `${p.id}: ${p.name}`));
      }
    }
    
    // Get specialties for a specific place
    if (placeId) {
      let query = `
        SELECT s.* 
        FROM specialties s
        JOIN place_specialties ps ON s.id = ps.specialty_id
        WHERE ps.place_id = ?
      `;
      
      // If hierarchical, we want to include parent categories even if not directly associated
      if (hierarchical) {
        query = `
          SELECT DISTINCT s.*
          FROM specialties s
          LEFT JOIN specialties child ON child.parent_id = s.id
          LEFT JOIN place_specialties ps ON (ps.specialty_id = s.id OR ps.specialty_id = child.id)
          WHERE ps.place_id = ? AND (s.parent_id IS NULL OR s.id IN (
            SELECT parent_id FROM specialties WHERE id IN (
              SELECT specialty_id FROM place_specialties WHERE place_id = ?
            ) AND parent_id IS NOT NULL
          ))
          ORDER BY s.name
        `;
        const specialties = await db.all(query, [placeId, placeId]);
        
        if (debug) {
          console.log(`DEBUG Found ${specialties.length} hierarchical specialties for place ID=${placeId}:`,
            specialties.map(s => `${s.id}: ${s.name}`));
        }
        
        // Build hierarchical structure if requested
        if (hierarchical) {
          const hierarchicalSpecialties = buildHierarchy(specialties);
          return NextResponse.json(hierarchicalSpecialties);
        }
        
        return NextResponse.json(specialties);
      }
      
      // Standard flat list of specialties for the place
      query += ' ORDER BY s.name';
      const specialties = await db.all(query, placeId);
      
      if (debug) {
        console.log(`DEBUG Found ${specialties.length} specialties for place ID=${placeId}:`,
          specialties.map(s => `${s.id}: ${s.name}`));
      }
      
      return NextResponse.json(specialties);
    }
    
    // Get specialties for a specific place type
    if (typeId) {
      const specialties = await db.all(`
        SELECT s.* 
        FROM specialties s
        JOIN place_type_specialties pts ON s.id = pts.specialty_id
        WHERE pts.type_id = ?
        ORDER BY s.name
      `, typeId);
      
      return NextResponse.json(specialties);
    }
    
    // Get only main categories (parent_id IS NULL)
    if (mainOnly) {
      const mainCategories = await db.all('SELECT * FROM specialties WHERE parent_id IS NULL ORDER BY name');
      return NextResponse.json(mainCategories);
    }
    
    // Get specialties by specific IDs
    if (idsParam) {
      try {
        // Parse the comma-separated IDs and ensure they are valid integers
        const ids = idsParam.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id));
        
        if (ids.length === 0) {
          return NextResponse.json([]); // Return empty array if no valid IDs
        }
        
        // Create placeholders for the SQL query
        const placeholders = ids.map(() => '?').join(',');
        
        // Fetch the specialties with the provided IDs
        const specialties = await db.all(
          `SELECT * FROM specialties WHERE id IN (${placeholders}) ORDER BY name`,
          ids
        );
        
        if (debug) {
          console.log(`DEBUG Found ${specialties.length} specialties matching IDs:`, ids);
        }
        
        return NextResponse.json(specialties);
      } catch (error) {
        console.error('Error fetching specialties by IDs:', error);
        return NextResponse.json({ error: 'Failed to fetch specialties by IDs' }, { status: 400 });
      }
    }
    
    // Get subcategories for a specific parent
    if (parentId !== null && parentId !== undefined) {
      const subcategories = await db.all(
        'SELECT * FROM specialties WHERE parent_id = ? ORDER BY name',
        parentId
      );
      return NextResponse.json(subcategories);
    }
    
    // Get all specialties in hierarchical structure
    if (hierarchical) {
      const allSpecialties = await db.all('SELECT * FROM specialties ORDER BY name');
      const hierarchicalSpecialties = buildHierarchy(allSpecialties);
      return NextResponse.json(hierarchicalSpecialties);
    }
    
    // Search for specialties by name if name parameter is provided
    if (nameParam && nameParam.length > 0) {
      console.log('Searching for specialties by name:', nameParam);
      
      // Create placeholders for the SQL query
      const placeholders = nameParam.map(() => '?').join(' OR name = ');
      const query = `SELECT * FROM specialties WHERE name = ${placeholders} COLLATE NOCASE`;
      
      const specialties = await db.all(query, nameParam);
      console.log(`Found ${specialties.length} specialties matching names:`, specialties.map(s => `${s.id}: ${s.name}`));
      
      return NextResponse.json(specialties);
    }
    
    // Get all specialties by default
    const specialties = await db.all('SELECT * FROM specialties ORDER BY name');
    return NextResponse.json(specialties);
    
  } catch (error) {
    console.error('Error in GET /api/specialties:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to build hierarchical structure from flat specialty list
function buildHierarchy(specialties: Specialty[]): HierarchicalSpecialty[] {
  // Create a map of all specialties by id for quick lookup
  const specialtyMap = new Map<number, HierarchicalSpecialty>();
  specialties.forEach(specialty => {
    specialtyMap.set(specialty.id, { ...specialty, subcategories: [] });
  });
  
  // Create root array for top-level categories
  const rootCategories: HierarchicalSpecialty[] = [];
  
  // Assign subcategories to their parents
  specialties.forEach(specialty => {
    if (specialty.parent_id === null) {
      // This is a main category
      rootCategories.push(specialtyMap.get(specialty.id)!);
    } else {
      // This is a subcategory, add it to its parent
      const parent = specialtyMap.get(specialty.parent_id);
      if (parent && parent.subcategories) {
        parent.subcategories.push(specialtyMap.get(specialty.id)!);
      }
    }
  });
  
  return rootCategories;
}

// API endpoint to save specialties for a place
export async function POST(request: NextRequest) {
  try {
    const placeId = Number(request.nextUrl.searchParams.get('place_id'));
    const specialtyIds: number[] = await request.json();
    
    if (!placeId) {
      return NextResponse.json({ error: 'Missing place_id parameter' }, { status: 400 });
    }
    
    const db = await getDb();
    
    // Begin transaction
    await db.run('BEGIN TRANSACTION');
    
    try {
      // Delete existing specialty associations for this place
      await db.run('DELETE FROM place_specialties WHERE place_id = ?', [placeId]);
      
      // First set specialties text to an empty string in case no specialties are selected
      await db.run('UPDATE places SET specialties = ? WHERE id = ?', ['', placeId]);
      
      // Insert new specialty associations
      if (specialtyIds.length > 0) {
        const stmt = await db.prepare('INSERT INTO place_specialties (place_id, specialty_id) VALUES (?, ?)');
        for (const specialtyId of specialtyIds) {
          await stmt.run([placeId, specialtyId]);
        }
        await stmt.finalize();
        
        // Fetch specialty names for the selected IDs to update the place specialties text field
        const specialtyRows = await db.all(
          'SELECT id, name FROM specialties WHERE id IN (' + specialtyIds.map(() => '?').join(',') + ')',
          [...specialtyIds]
        );
        
        console.log(`Updating specialties text for place ID ${placeId} with ${specialtyRows.length} specialties`);
        specialtyRows.forEach(row => console.log(`- ${row.id}: ${row.name}`));
        
        // Update the place's specialties text field with comma-separated specialty names
        const specialtiesText = specialtyRows.map(row => row.name).join(', ');
        await db.run('UPDATE places SET specialties = ? WHERE id = ?', [specialtiesText, placeId]);
        
        // Verify the update worked
        const place = await db.get('SELECT id, name, specialties FROM places WHERE id = ?', [placeId]);
        console.log(`Updated place ${place.name} (ID: ${place.id}) specialties to: "${place.specialties}"`); 
      } else {
        // Log when all specialties are removed
        const place = await db.get('SELECT name FROM places WHERE id = ?', [placeId]);
        console.log(`All specialties removed from place: ${place.name} (ID: ${placeId})`);
      }
      
      // Commit transaction
      await db.run('COMMIT');
      
      return NextResponse.json({ success: true });
    } catch (error) {
      // Rollback transaction on error
      await db.run('ROLLBACK');
      throw error; // Re-throw to be caught by outer catch block
    }
  } catch (error) {
    console.error('Error in POST /api/specialties:', error);
    return NextResponse.json({ error: 'Failed to save specialties' }, { status: 500 });
  }
}

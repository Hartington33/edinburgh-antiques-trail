import { getDb } from './db';

export interface Specialty {
  id: number;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

// Get all specialties
export async function getSpecialties(): Promise<Specialty[]> {
  const db = await getDb();
  return await db.all('SELECT * FROM specialties ORDER BY name');
}

// Get specialties for a specific place type
export async function getSpecialtiesByType(typeId: number): Promise<Specialty[]> {
  const db = await getDb();
  return await db.all(`
    SELECT s.* 
    FROM specialties s
    JOIN place_type_specialties pts ON s.id = pts.specialty_id
    WHERE pts.type_id = ?
    ORDER BY s.name
  `, typeId);
}

// Get specialties for a specific place
export async function getSpecialtiesByPlace(placeId: number): Promise<Specialty[]> {
  const db = await getDb();
  return await db.all(`
    SELECT s.* 
    FROM specialties s
    JOIN place_specialties ps ON s.id = ps.specialty_id
    WHERE ps.place_id = ?
    ORDER BY s.name
  `, placeId);
}

// Save specialties for a place
export async function saveSpecialtiesForPlace(placeId: number, specialtyIds: number[]): Promise<boolean> {
  const db = await getDb();
  
  try {
    // Start a transaction
    await db.run('BEGIN TRANSACTION');
    
    // Delete existing specialties for this place
    await db.run('DELETE FROM place_specialties WHERE place_id = ?', placeId);
    
    // Insert the new associations
    for (const specialtyId of specialtyIds) {
      await db.run(
        'INSERT INTO place_specialties (place_id, specialty_id) VALUES (?, ?)',
        placeId, specialtyId
      );
    }
    
    // Commit the transaction
    await db.run('COMMIT');
    return true;
  } catch (error) {
    // Rollback in case of error
    await db.run('ROLLBACK');
    console.error('Error saving specialties:', error);
    throw error;
  }
}

// Find or create specialties from a comma-separated text string
export async function syncSpecialtiesFromText(placeId: number, specialtiesText: string | null): Promise<boolean> {
  if (!specialtiesText || specialtiesText.trim() === '') {
    // If no specialties text is provided, just clear the place's specialties
    return await saveSpecialtiesForPlace(placeId, []);
  }
  
  const db = await getDb();
  const specialtyNames = specialtiesText.split(',').map(s => s.trim()).filter(s => s !== '');
  
  if (specialtyNames.length === 0) {
    return await saveSpecialtiesForPlace(placeId, []);
  }
  
  try {
    // First, find existing specialties
    const specialtyIdsToSave: number[] = [];
    
    for (const name of specialtyNames) {
      // Find existing specialty or create a new one
      const specialty = await db.get('SELECT id FROM specialties WHERE name = ? COLLATE NOCASE', name);
      
      if (specialty) {
        specialtyIdsToSave.push(specialty.id);
      } else {
        // Create new specialty if it doesn't exist
        const result = await db.run(
          'INSERT INTO specialties (name) VALUES (?)', 
          name
        );
        if (result.lastID) {
          specialtyIdsToSave.push(result.lastID);
        }
      }
    }
    
    // Save the specialty IDs to the place_specialties table
    return await saveSpecialtiesForPlace(placeId, specialtyIdsToSave);
  } catch (error) {
    console.error('Error syncing specialties from text:', error);
    return false;
  }
}

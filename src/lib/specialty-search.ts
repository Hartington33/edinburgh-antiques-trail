import { getDb } from './db';

export async function getPlacesBySpecialties(specialtyIds: number[], filters: {
  typeId?: string | number;
  priceRange?: string;
  searchTerm?: string;
} = {}) {
  try {
    if (!specialtyIds || !specialtyIds.length) {
      return [];
    }
    
    const db = await getDb();
    
    // Build base query with required joins
    let query = `
      SELECT DISTINCT p.*, pt.name as type_name
      FROM places p
      JOIN place_types pt ON p.type_id = pt.id
      JOIN place_specialties ps ON p.id = ps.place_id
      WHERE ps.specialty_id IN (${specialtyIds.map(() => '?').join(',')})
    `;
    
    // Parameters array starting with specialty IDs
    const params = [...specialtyIds];
    
    // Add typeId filter if present
    if (filters.typeId) {
      const typeIdNum = typeof filters.typeId === 'string' ? parseInt(filters.typeId) : filters.typeId;
      query += ` AND p.type_id = ?`;
      params.push(typeIdNum);
    }
    
    // Add price range filter if present
    if (filters.priceRange) {
      query += ` AND p.price_range = ?`;
      params.push(filters.priceRange);
    }
    
    // Add search term filter if present
    if (filters.searchTerm) {
      query += ` AND (
        p.name LIKE ? OR
        p.address LIKE ? OR
        p.description LIKE ?
      )`;
      const searchPattern = `%${filters.searchTerm}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }
    
    // Group by place id to ensure we can count specialties
    query += ` GROUP BY p.id`;
    
    // Get places that match ANY of the selected specialties first
    const places = await db.all(query, params);
    return places;
  } catch (error) {
    console.error('Error in getPlacesBySpecialties:', error);
    throw error;
  }
}

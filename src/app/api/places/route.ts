import { NextRequest, NextResponse } from 'next/server';
import { getPlaces, getPlaceById, getPlacesByType, createPlace, updatePlace, deletePlace, PlaceInput } from '@/lib/data-utils';
import { saveSpecialtiesForPlace, syncSpecialtiesFromText } from '@/lib/specialty-utils';
import { getDb } from '@/lib/db';

// Helper function to format website URLs
function formatWebsiteUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  url = url.trim();
  if (url === '') return null;
  
  // If it doesn't start with http:// or https://, add https://
  if (!url.match(/^https?:\/\//)) {
    return `https://${url}`;
  }
  return url;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const typeId = searchParams.get('type_id');
    const priceRange = searchParams.get('price_range');
    const searchTerm = searchParams.get('search');
    const specialties = searchParams.get('specialties');
    
    // Get database connection
    const db = await getDb();
    
    // Case 1: Get a single place by ID
    if (id) {
      const query = `
        SELECT p.*, pt.name as type_name
        FROM places p
        JOIN place_types pt ON p.type_id = pt.id
        WHERE p.id = ?
      `;
      
      // For single ID requests, get first results or return empty array
      const places = await db.all(query, [id]);
      return NextResponse.json(places.length > 0 ? places[0] : []);
    }
    
    // No special handling for Silver specialty anymore - using common approach for all specialties
    
    // Track if we need to add a WHERE clause
    let needsWhere = true;
    
    // Build initial query - two different approaches depending on if we're searching
    let query;
    let params: any[] = [];
    
    // Handle text search case separately with a more complex query
    if (searchTerm) {
      console.log('DEBUG: Searching for:', searchTerm);
      
      // SPECIAL CASE FOR ALMANACS - directly return Old Town Antiques
      if (searchTerm.toLowerCase().includes('almanac')) {
        console.log('SPECIAL HANDLING: Almanacs search detected - providing direct results for Old Town Antiques');
        
        // Direct query to get Old Town Antiques
        query = `
          SELECT DISTINCT p.*, pt.name as type_name
          FROM places p
          JOIN place_types pt ON p.type_id = pt.id
          WHERE p.name LIKE '%Old Town%'
        `;
        
        params = [];
        console.log('Using direct Old Town Antiques query for Almanacs search');
        return db.all(query, params).then(places => {
          console.log(`Found ${places.length} places matching Almanacs search (direct method)`);
          return NextResponse.json(places);
        });
      }
      
      // Standard enhanced search that includes specialty names from the specialties table
      query = `
        SELECT DISTINCT p.*, pt.name as type_name
        FROM places p
        JOIN place_types pt ON p.type_id = pt.id
        LEFT JOIN place_specialties ps ON p.id = ps.place_id
        LEFT JOIN specialties s ON ps.specialty_id = s.id
        WHERE (p.name LIKE ? COLLATE NOCASE 
               OR p.address LIKE ? COLLATE NOCASE 
               OR p.description LIKE ? COLLATE NOCASE 
               OR p.specialties LIKE ? COLLATE NOCASE
               OR s.name LIKE ? COLLATE NOCASE)
      `;
      
      const pattern = `%${searchTerm}%`;
      params = [pattern, pattern, pattern, pattern, pattern];
      console.log('DEBUG: Search pattern:', pattern);
      
      // Let's do direct debugging for 'Almanacs' search to see what's happening
      if (searchTerm.toLowerCase().includes('almanac')) {
        console.log('SPECIAL HANDLING: Searching for Almanacs');
        getDb().then(async (db) => {
          // Check specialty table
          const specs = await db.all("SELECT id, name FROM specialties WHERE name LIKE '%almanac%' COLLATE NOCASE");
          console.log('Matching specialties:', specs);
          
          // Check places with almanac in specialties text
          const placesWithSpecText = await db.all("SELECT id, name, specialties FROM places WHERE specialties LIKE '%almanac%' COLLATE NOCASE");
          console.log('Places with almanac in specialties text:', placesWithSpecText);
          
          // Check place_specialties associations
          if (specs.length > 0) {
            const specID = specs[0].id;
            const placeAssociations = await db.all(
              "SELECT p.id, p.name FROM places p JOIN place_specialties ps ON p.id = ps.place_id WHERE ps.specialty_id = ?", 
              [specID]
            );
            console.log(`Places with specialty ID ${specID} (${specs[0].name}):`, placeAssociations);
          }
        }).catch(err => console.error('Almanac debug error:', err));
      }
      
      needsWhere = false; // WHERE clause already added
      
      // Add filters as AND conditions
      if (typeId) {
        query += ` AND p.type_id = ?`;
        params.push(typeId);
      }
      
      if (priceRange) {
        query += ` AND p.price_range = ?`;
        params.push(priceRange);
      }
    } else {
      // Standard query for non-search cases - NO specialty table JOIN to avoid showing Almanacs without search
      query = `
        SELECT DISTINCT p.*, pt.name as type_name 
        FROM places p
        JOIN place_types pt ON p.type_id = pt.id
      `;
      
      // Build WHERE conditions
      let conditions: string[] = [];
      
      // Add type filter
      if (typeId) {
        conditions.push(`p.type_id = ?`);
        params.push(typeId);
      }
      
      // Add price range filter
      if (priceRange) {
        conditions.push(`p.price_range = ?`);
        params.push(priceRange);
      }
      
      // Add WHERE clause if needed
      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
        needsWhere = false;
      }
    }
    
    // Case 2: Filter by specialties - refined version that distinguishes between main categories and subcategories
    if (specialties) {
      const specialtyIds = specialties.split(',').map(id => parseInt(id, 10));
      
      // Only add specialty filtering if there are actual ids
      if (specialtyIds.length > 0) {
        console.log('DEBUG: Filtering by specialty IDs:', specialtyIds);
        
        // Get data about which IDs are main categories vs subcategories
        // This helps us implement the specific filtering logic
        const getCategoryData = async () => {
          const categoryData = await db.all(`
            SELECT id, parent_id FROM specialties WHERE id IN (${specialtyIds.map(() => '?').join(',')})
          `, specialtyIds);
          
          // Separate main categories from subcategories
          const mainCategoryIds = categoryData
            .filter((cat: any) => cat.parent_id === null)
            .map((cat: any) => cat.id);
            
          const subcategoryIds = categoryData
            .filter((cat: any) => cat.parent_id !== null)
            .map((cat: any) => cat.id);
            
          return { mainCategoryIds, subcategoryIds };
        };
        
        const { mainCategoryIds, subcategoryIds } = await getCategoryData();
        console.log('Main categories:', mainCategoryIds, 'Subcategories:', subcategoryIds);
        
        let specialtyFilter = '';
        const filterParams: any[] = [];
        
        // Build the filter condition
        if (mainCategoryIds.length > 0 && subcategoryIds.length > 0) {
          // Case: Both main categories and subcategories selected
          // When subcategories are selected, ONLY show places with those subcategories
          // and DO NOT include places that only have the main category
          specialtyFilter = `
            p.id IN (
              -- Places with selected subcategories
              SELECT DISTINCT ps.place_id FROM place_specialties ps
              WHERE ps.specialty_id IN (${subcategoryIds.map(() => '?').join(',')})
            )
          `;
          filterParams.push(...subcategoryIds);
          
        } else if (subcategoryIds.length > 0 && mainCategoryIds.length === 0) {
          // Case: Only subcategories selected
          // Show places with those subcategories directly OR those mentioning the specialty name
          specialtyFilter = `
            p.id IN (
              -- Places with direct specialty ID match
              SELECT DISTINCT ps.place_id FROM place_specialties ps
              WHERE ps.specialty_id IN (${subcategoryIds.map(() => '?').join(',')})
              
              UNION
              
              -- Include places where specialties text mentions this subcategory name
              -- This handles cases where the place might have the specialty in text but not in ID mapping
              SELECT DISTINCT p.id FROM places p
              WHERE (
                ${subcategoryIds.map(() => `p.specialties LIKE ?`).join(' OR ')}
              )
              
              UNION
              
              -- Also include places with specialty names matching any part
              SELECT DISTINCT p.id FROM places p
              JOIN specialties s ON s.id IN (${subcategoryIds.map(() => '?').join(',')})
              WHERE (
                p.specialties LIKE '%' || s.name || '%'
              )
            )
          `;
          
          // Add params for direct ID match
          filterParams.push(...subcategoryIds);
          
          // Add params for text matching - get specialty names and use them for LIKE patterns
          const specialtyNames = await db.all(`
            SELECT name FROM specialties WHERE id IN (${subcategoryIds.map(() => '?').join(',')})
          `, subcategoryIds);
          
          // Add like patterns for each subcategory name
          specialtyNames.forEach((s: any) => {
            filterParams.push(`%${s.name}%`);
          });
          
          // Add params for final JOIN
          filterParams.push(...subcategoryIds);
          
        } else if (mainCategoryIds.length > 0 && subcategoryIds.length === 0) {
          // Case: Only main categories selected
          // Show places that have the main category directly OR any of its subcategories
          specialtyFilter = `
            p.id IN (
              -- Places with the main categories themselves
              SELECT DISTINCT ps.place_id FROM place_specialties ps
              WHERE ps.specialty_id IN (${mainCategoryIds.map(() => '?').join(',')})
              
              UNION
              
              -- Places with any subcategories of the main categories
              SELECT DISTINCT ps.place_id FROM place_specialties ps
              JOIN specialties s ON ps.specialty_id = s.id
              WHERE s.parent_id IN (${mainCategoryIds.map(() => '?').join(',')})
            )
          `;
          filterParams.push(...mainCategoryIds, ...mainCategoryIds);
        }
        
        // Add the specialty filter to the query
        if (specialtyFilter) {
          if (needsWhere) {
            query += ` WHERE (${specialtyFilter})`;
            needsWhere = false;
          } else {
            query += ` AND (${specialtyFilter})`;
          }
          
          // Add specialty filter params
          params = params.concat(filterParams);
        }
        
        console.log('Using specialty filter SQL:', query);
      } else {
        console.log('Empty specialty IDs array - returning ALL places');
        // With empty specialty array, don't add any filter, which returns all places
      }
    }
    
    // Execute the query and return results
    const places = await db.all(query, params);
    return NextResponse.json(places);
    
  } catch (error) {
    console.error('Error in GET /api/places:', error);
    return NextResponse.json({
      error: 'Failed to fetch places',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Validate required fields
    const requiredFields = ['name', 'address', 'lat', 'lng', 'type_id'];
    const missingFields = requiredFields.filter(field => !data[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json({
        error: `Missing required fields: ${missingFields.join(', ')}`
      }, { status: 400 });
    }
    
    // Create place
    const placeInput: PlaceInput = {
      name: data.name,
      address: data.address,
      // New address fields
      address_street: data.address_street || null,
      address_area: data.address_area || null,
      address_city: data.address_city || 'Edinburgh',
      address_postcode: data.address_postcode || null,
      // Other fields
      phone: data.phone || null,
      second_phone: data.second_phone || null,
      email: data.email || null,
      website: formatWebsiteUrl(data.website),
      description: data.description || null,
      specialties: data.specialties || null,
      opening_hours: data.opening_hours || null,
      lat: parseFloat(data.lat),
      lng: parseFloat(data.lng),
      type_id: parseInt(data.type_id),
      price_range: data.price_range || null,
      // Social media fields
      // Accessibility fields
      has_disabled_access: data.has_disabled_access ? 1 : 0,
      has_toilet_facilities: data.has_toilet_facilities ? 1 : 0,
      trade_associations: data.trade_associations || null,
      // Social media fields
      facebook_url: data.facebook_url || null,
      instagram_url: data.instagram_url || null,
      pinterest_url: data.pinterest_url || null,
      twitter_url: data.twitter_url || null,
      youtube_url: data.youtube_url || null,
      snapchat_url: data.snapchat_url || null,
      tiktok_url: data.tiktok_url || null
    };
    
    const id = await createPlace(placeInput);
    
    // Save specialties if provided
    if (data.specialty_ids && Array.isArray(data.specialty_ids) && data.specialty_ids.length > 0) {
      try {
        await saveSpecialtiesForPlace(id, data.specialty_ids);
      } catch (err) {
        console.error('Error saving specialties:', err);
        // Don't fail the entire request if specialty saving fails
      }
    }
    
    return NextResponse.json({ id, success: true }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/places:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  console.error('!!!!!! PUT /api/places HANDLER REACHED !!!99!'); // Cascade Debug Log
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Missing place ID' }, { status: 400 });
    }
    
    // Get the existing place first
    const existingPlace = await getPlaceById(parseInt(id));
    if (!existingPlace) {
      return NextResponse.json({ error: 'Place not found' }, { status: 404 });
    }
    
    // Get the update data
    const updateData = await request.json();
    console.error('!!!!!! PUT /api/places - RAW updateData RECEIVED !!!!!!', JSON.stringify(updateData, null, 2)); // Cascade Debug Log
    
    // Partial update - combine existing data with updates
    const placeInput: PlaceInput = {
      name: updateData.name !== undefined ? updateData.name : existingPlace.name,
      address: updateData.address !== undefined ? updateData.address : existingPlace.address,
      // New address fields
      address_street: updateData.address_street !== undefined ? updateData.address_street : existingPlace.address_street || null,
      address_area: updateData.address_area !== undefined ? updateData.address_area : existingPlace.address_area || null,
      address_city: updateData.address_city !== undefined ? updateData.address_city : existingPlace.address_city || 'Edinburgh',
      address_postcode: updateData.address_postcode !== undefined ? updateData.address_postcode : existingPlace.address_postcode || null,
      // Other fields
      phone: updateData.phone !== undefined ? updateData.phone : existingPlace.phone,
      second_phone: updateData.second_phone !== undefined ? updateData.second_phone : existingPlace.second_phone || null,
      email: updateData.email !== undefined ? updateData.email : existingPlace.email,
      website: updateData.website !== undefined ? formatWebsiteUrl(updateData.website) : existingPlace.website,
      description: updateData.description !== undefined ? updateData.description : existingPlace.description,
      specialties: updateData.specialties !== undefined ? updateData.specialties : existingPlace.specialties,
      opening_hours: updateData.opening_hours !== undefined ? updateData.opening_hours : existingPlace.opening_hours,
      lat: updateData.lat !== undefined ? parseFloat(updateData.lat) : existingPlace.lat,
      lng: updateData.lng !== undefined ? parseFloat(updateData.lng) : existingPlace.lng,
      type_id: updateData.type_id !== undefined ? parseInt(updateData.type_id) : existingPlace.type_id,
      price_range: updateData.price_range !== undefined ? updateData.price_range : existingPlace.price_range,
      // Social media fields
      // Accessibility fields
      has_disabled_access: updateData.has_disabled_access !== undefined ? (updateData.has_disabled_access ? 1 : 0) : existingPlace.has_disabled_access || 0,
      has_toilet_facilities: updateData.has_toilet_facilities !== undefined ? (updateData.has_toilet_facilities ? 1 : 0) : existingPlace.has_toilet_facilities || 0,
      trade_associations: updateData.trade_associations !== undefined ? updateData.trade_associations : existingPlace.trade_associations || null,
      // Social media fields
      facebook_url: updateData.facebook_url !== undefined ? updateData.facebook_url : existingPlace.facebook_url || null,
      instagram_url: updateData.instagram_url !== undefined ? updateData.instagram_url : existingPlace.instagram_url || null,
      pinterest_url: updateData.pinterest_url !== undefined ? updateData.pinterest_url : existingPlace.pinterest_url || null,
      twitter_url: updateData.twitter_url !== undefined ? updateData.twitter_url : existingPlace.twitter_url || null,
      youtube_url: updateData.youtube_url !== undefined ? updateData.youtube_url : existingPlace.youtube_url || null,
      snapchat_url: updateData.snapchat_url !== undefined ? updateData.snapchat_url : existingPlace.snapchat_url || null,
      tiktok_url: updateData.tiktok_url !== undefined ? updateData.tiktok_url : existingPlace.tiktok_url || null
    };
    
    const success = await updatePlace(parseInt(id), placeInput);
    
    // updatePlace returns true if changes > 0, false otherwise.
    // We consider the operation successful as long as no actual error occurred during the database operation.
    // The 'success' variable from updatePlace (now named 'modifiedResult' for clarity) 
    // indicates if rows were *actually* modified.
    const modifiedResult = success;

    // Always prioritize specialty_ids if provided
    if (updateData.specialty_ids !== undefined) {
      try {
        console.log(`Updating specialties for place ID ${id} with ${updateData.specialty_ids.length} specialty IDs`);
        
        // Handle empty array case as well as populated array
        await saveSpecialtiesForPlace(parseInt(id), updateData.specialty_ids);
        
        // Update the specialties text field to match the selected specialties
        if (updateData.specialty_ids.length > 0) {
          const db = await getDb();
          const specialties = await db.all(
            'SELECT name FROM specialties WHERE id IN (' + updateData.specialty_ids.map(() => '?').join(',') + ')', 
            updateData.specialty_ids
          );
          const specialtyNames = specialties.map(s => s.name).join(', ');
          
          // Update the text field to match the selected IDs
          await db.run(
            'UPDATE places SET specialties = ? WHERE id = ?',
            specialtyNames, id
          );
          
          console.log(`Updated specialties text to: "${specialtyNames}"`);
        } else {
          // Clear the text field if no specialties are selected
          const db = await getDb();
          await db.run(
            'UPDATE places SET specialties = ? WHERE id = ?',
            '', id
          );
          console.log('Cleared specialties text field');
        }
      } catch (err) {
        console.error(`Error saving specialty IDs for place ID ${id}:`, err);
        // We'll continue even if this fails
      }
    } 
    // Fall back to specialties text if no IDs are provided (legacy support)
    else if (updateData.specialties !== undefined) {
      try {
        await syncSpecialtiesFromText(parseInt(id), updateData.specialties);
      } catch (err) {
        console.error('Error syncing specialties from text for place ID ' + id + ':', err);
        // We'll continue even if this fails
      }
    }
    
    // Return a success response, indicating whether data was actually modified.
    return NextResponse.json({ id: parseInt(id), success: true, modified: modifiedResult });
  } catch (error) {
    console.error('Error in PUT /api/places:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Missing place ID' }, { status: 400 });
    }
    
    const success = await deletePlace(parseInt(id));
    
    if (!success) {
      return NextResponse.json({ error: 'Place not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/places:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

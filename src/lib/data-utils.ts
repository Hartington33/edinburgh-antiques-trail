import { getDb } from './db';

// Types for structured data
export interface OpeningHour {
  id?: number;
  place_id: number;
  day_of_week: number; // 0 = Sunday, 1 = Monday, etc.
  open_time: string | null; // Format: HH:MM in 24-hour format
  close_time: string | null; // Format: HH:MM in 24-hour format
  is_closed: boolean;
  is_by_appointment: boolean;
  notes?: string | null;
}

export interface OnlineSalesLink {
  id?: number;
  place_id: number;
  platform_name: string; // e.g., 'eBay', 'Etsy', 'Vinted'
  url: string;
  description?: string | null;
}

export interface SocialMediaLink {
  id?: number;
  place_id: number;
  platform: 'facebook' | 'instagram' | 'pinterest' | 'twitter' | 'youtube' | 'snapchat' | 'tiktok' | 'other';
  url: string;
}

// Removed Neighborhood type

export type PlaceType = {
  id: number;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
};

export type PlaceInput = {
  name: string;
  // Legacy address field - will be deprecated
  address: string;
  // New address fields
  address_street?: string | null;
  address_area?: string | null;
  address_city?: string | null;
  address_postcode?: string | null;
  // Other fields
  phone?: string | null;
  second_phone?: string | null;
  email?: string | null;
  website?: string | null;
  description?: string | null;
  specialties?: string | null;
  opening_hours?: string | null;
  lat: number | string;
  lng: number | string;
  type_id: number;
  price_range?: string | null;
  // Accessibility fields
  has_disabled_access?: boolean | number | null;
  has_toilet_facilities?: boolean | number | null;
  trade_associations?: string | null;
  // Social media fields
  facebook_url?: string | null;
  instagram_url?: string | null;
  pinterest_url?: string | null;
  twitter_url?: string | null;
  youtube_url?: string | null;
  snapchat_url?: string | null;
  tiktok_url?: string | null;
};

export type Place = PlaceInput & {
  id: number;
  created_at: string;
  updated_at: string;
};

export type PlaceWithDetails = Place & {
  type_name: string;
  specialty_ids?: number[];
  specialty_names?: { id: number; name: string; parent_id: number | null }[];
};

// PlaceInput is already defined above

// Neighborhood CRUD operations removed

// Place Type CRUD operations
export async function getPlaceTypes(): Promise<PlaceType[]> {
  const db = await getDb();
  return await db.all('SELECT * FROM place_types ORDER BY name');
}

export async function getPlaceTypeById(id: number): Promise<PlaceType | undefined> {
  const db = await getDb();
  return await db.get('SELECT * FROM place_types WHERE id = ?', id);
}

export async function createPlaceType(name: string, description: string): Promise<number> {
  const db = await getDb();
  const result = await db.run(
    'INSERT INTO place_types (name, description) VALUES (?, ?)',
    name, description
  );
  return result.lastID;
}

export async function updatePlaceType(id: number, name: string, description: string): Promise<boolean> {
  const db = await getDb();
  const result = await db.run(
    'UPDATE place_types SET name = ?, description = ? WHERE id = ?',
    name, description, id
  );
  return result.changes > 0;
}

export async function deletePlaceType(id: number): Promise<boolean> {
  const db = await getDb();
  // Check if the place type is referenced by places
  const places = await db.get('SELECT COUNT(*) as count FROM places WHERE type_id = ?', id);
  if (places.count > 0) {
    throw new Error('Cannot delete place type that is referenced by places');
  }
  
  const result = await db.run('DELETE FROM place_types WHERE id = ?', id);
  return result.changes > 0;
}

// Place CRUD operations
export async function getPlaces(): Promise<PlaceWithDetails[]> {
  const db = await getDb();
  return await db.all(`
    SELECT 
      p.*, 
      pt.name as type_name
    FROM places p
    JOIN place_types pt ON p.type_id = pt.id
    ORDER BY p.name
  `);
}

export async function getPlacesByType(typeId: number): Promise<PlaceWithDetails[]> {
  const db = await getDb();
  return await db.all(`
    SELECT 
      p.*, 
      pt.name as type_name
    FROM places p
    JOIN place_types pt ON p.type_id = pt.id
    WHERE p.type_id = ?
    ORDER BY p.name
  `, typeId);
}

// getPlacesByNeighborhood function removed

export async function getPlacesBySpecialty(specialtyId: number): Promise<PlaceWithDetails[]> {
  const db = await getDb();
  return await db.all(`
    SELECT 
      p.*, 
      pt.name as type_name
    FROM places p
    JOIN place_types pt ON p.type_id = pt.id
    JOIN place_specialties ps ON p.id = ps.place_id
    WHERE ps.specialty_id = ?
    ORDER BY p.name
  `, [specialtyId]);
}

// Fetch specialties for a place
export async function getSpecialtiesByPlaceId(placeId: number): Promise<{id: number, name: string, parent_id: number | null}[]> {
  const db = await getDb();
  try {
    return await db.all(`
      SELECT s.id, s.name, s.parent_id
      FROM specialties s
      JOIN place_specialties ps ON s.id = ps.specialty_id
      WHERE ps.place_id = ?
      ORDER BY s.parent_id NULLS FIRST, s.name
    `, placeId);
  } catch (error) {
    console.error('Error in getSpecialtiesByPlaceId:', error);
    return [];
  }
}

// Get place specialty IDs
export async function getPlaceSpecialtyIds(placeId: number): Promise<number[]> {
  const db = await getDb();
  try {
    const specialties = await db.all(`
      SELECT specialty_id
      FROM place_specialties
      WHERE place_id = ?
    `, placeId);
    
    return specialties.map(s => s.specialty_id);
  } catch (error) {
    console.error('Error in getPlaceSpecialtyIds:', error);
    return [];
  }
}

export async function getPlaceById(id: number): Promise<Place | null> {
  const db = await getDb();
  
  try {
    // Join with place_types to get the type name
    const place = await db.get(`
      SELECT 
        p.*,
        pt.name as type_name
      FROM places p
      JOIN place_types pt ON p.type_id = pt.id
      WHERE p.id = ?
    `, id);
    
    if (!place) {
      return null;
    }
    
    // Get specialties for the place
    place.specialty_ids = await getPlaceSpecialtyIds(id);
    place.specialty_names = await getSpecialtiesByPlaceId(id);
    
    if (place) {
      console.log(`!!!!!! data-utils: getPlaceById RETRIEVED place ${id} !!!!!!`, {
        id: place.id,
        name: place.name,
        lat: place.lat,
        lng: place.lng,
        lat_type: typeof place.lat,
        lng_type: typeof place.lng
      });
    }
    
    return place;
  } catch (error) {
    console.error('Error in getPlaceById:', error);
    return null;
  }
}

export async function createPlace(place: PlaceInput): Promise<number> {
  const db = await getDb();
  const result = await db.run(`
    INSERT INTO places (
      name, address, phone, second_phone, email, website, description, 
      specialties, opening_hours, lat, lng, type_id, price_range,
      has_disabled_access, has_toilet_facilities, trade_associations,
      facebook_url, instagram_url, pinterest_url, twitter_url, youtube_url, snapchat_url, tiktok_url,
      address_street, address_area, address_city, address_postcode
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
    place.name,
    place.address,
    place.phone,
    place.second_phone,
    place.email,
    place.website,
    place.description,
    place.specialties,
    place.opening_hours,
    place.lat,
    place.lng,
    place.type_id,
    place.price_range,
    place.facebook_url,
    place.instagram_url,
    place.pinterest_url,
    place.twitter_url,
    place.youtube_url,
    place.snapchat_url,
    place.tiktok_url,
    place.address_street,
    place.address_area,
    place.address_city || 'Edinburgh',
    place.address_postcode
  );
  return result.lastID;
}

export async function updatePlace(id: number, place: PlaceInput): Promise<boolean> {
  const db = await getDb();
  console.error('!!!!!! data-utils: updatePlace CALLED !!!!!!', { 
    id, 
    place,
    lat_value: place.lat,
    lng_value: place.lng,
    lat_type: typeof place.lat,
    lng_type: typeof place.lng
  });
  
  // Get current place to compare values
  const currentPlace = await db.get('SELECT * FROM places WHERE id = ?', [id]);
  if (currentPlace) {
    console.error('!!!!!! data-utils: CURRENT place in DB !!!!!!', {
      id: currentPlace.id,
      lat: currentPlace.lat,
      lng: currentPlace.lng,
      lat_type: typeof currentPlace.lat,
      lng_type: typeof currentPlace.lng,
      lat_diff: Number(currentPlace.lat) - Number(place.lat),
      lng_diff: Number(currentPlace.lng) - Number(place.lng)
    });
  }
  
  // Use named parameters for clarity
  const sqlParams = {
    $name: place.name,
    $address: place.address,
    $address_street: place.address_street,
    $address_area: place.address_area,
    $address_city: place.address_city,
    $address_postcode: place.address_postcode,
    $phone: place.phone,
    $second_phone: place.second_phone,
    $email: place.email,
    $website: place.website,
    $description: place.description,
    $specialties: place.specialties,
    $opening_hours: place.opening_hours,
    $lat: place.lat,
    $lng: place.lng,
    $type_id: place.type_id,
    $price_range: place.price_range,
    $has_disabled_access: place.has_disabled_access,
    $has_toilet_facilities: place.has_toilet_facilities,
    $trade_associations: place.trade_associations,
    $facebook_url: place.facebook_url,
    $instagram_url: place.instagram_url,
    $pinterest_url: place.pinterest_url,
    $twitter_url: place.twitter_url,
    $youtube_url: place.youtube_url,
    $snapchat_url: place.snapchat_url,
    $tiktok_url: place.tiktok_url,
    $id: id
  };
  
  console.error('!!!!!! data-utils: updatePlace SQL PARAMS !!!!!!', {
    lat: sqlParams.$lat,
    lng: sqlParams.$lng
  });
  
  const result = await db.run(`
    UPDATE places SET
      name = $name, 
      address = $address,
      address_street = $address_street,
      address_area = $address_area,
      address_city = $address_city,
      address_postcode = $address_postcode,
      phone = $phone,
      second_phone = $second_phone,
      email = $email,
      website = $website,
      description = $description,
      specialties = $specialties,
      opening_hours = $opening_hours,
      lat = $lat,
      lng = $lng,
      type_id = $type_id,
      price_range = $price_range,
      has_disabled_access = $has_disabled_access,
      has_toilet_facilities = $has_toilet_facilities,
      trade_associations = $trade_associations,
      facebook_url = $facebook_url,
      instagram_url = $instagram_url,
      pinterest_url = $pinterest_url,
      twitter_url = $twitter_url,
      youtube_url = $youtube_url,
      snapchat_url = $snapchat_url,
      tiktok_url = $tiktok_url
    WHERE id = $id;
  `, sqlParams);
  
  console.error('!!!!!! data-utils: updatePlace db.run SUCCEEDED !!!!!!', { 
    result,
    changes: result.changes
  });
  
  // If changes were made, retrieve the updated record to confirm
  if (result.changes > 0) {
    const updatedPlace = await db.get('SELECT * FROM places WHERE id = ?', [id]);
    if (updatedPlace) {
      console.error('!!!!!! data-utils: UPDATED place in DB !!!!!!', {
        id: updatedPlace.id,
        lat: updatedPlace.lat,
        lng: updatedPlace.lng
      });
    }
  }
  
  return result.changes > 0;
}

export async function deletePlace(id: number): Promise<boolean> {
  const db = await getDb();
  const result = await db.run('DELETE FROM places WHERE id = ?', id);
  return result.changes > 0;
}

// Dashboard statistics
export async function getDashboardStats() {
  const db = await getDb();
  
  const placeCountsByType = await db.all(`
    SELECT pt.name as type, COUNT(*) as count
    FROM places p
    JOIN place_types pt ON p.type_id = pt.id
    GROUP BY p.type_id
    ORDER BY count DESC
  `);
  
  // Get price range statistics
  const placeCountsByPriceRange = await db.all(`
    SELECT price_range as priceRange, COUNT(*) as count
    FROM places
    GROUP BY price_range
    ORDER BY 
      CASE 
        WHEN price_range = '£' THEN 1
        WHEN price_range = '££' THEN 2
        WHEN price_range = '£££' THEN 3
        WHEN price_range = '££££' THEN 4
        ELSE 5
      END
  `);
  
  const totalPlaces = (await db.get('SELECT COUNT(*) as count FROM places')).count;
  const totalPlaceTypes = (await db.get('SELECT COUNT(*) as count FROM place_types')).count;
  
  return {
    placeCountsByType,
    placeCountsByPriceRange,
    totalPlaces,
    totalPlaceTypes
  };
}

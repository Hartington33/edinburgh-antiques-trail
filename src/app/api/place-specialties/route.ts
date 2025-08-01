import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

interface SpecialtyData {
  id: number;
  name: string;
  parent_id: number | null;
}

interface FormattedSpecialties {
  mainCategories: SpecialtyData[];
  subcategories: SpecialtyData[];
}

// Get formatted specialties for a place - separating main categories from subcategories
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const placeId = searchParams.get('place_id');
    
    if (!placeId) {
      return NextResponse.json({ error: 'place_id is required' }, { status: 400 });
    }
    
    const db = await getDb();
    
    console.log('Fetching specialties for place ID:', placeId);
    
    // Get all specialties for the place with their parent-child relationships
    const specialties = await db.all(`
      SELECT s.id, s.name, s.parent_id
      FROM specialties s
      JOIN place_specialties ps ON s.id = ps.specialty_id
      WHERE ps.place_id = ?
    `, placeId);
    
    console.log('Raw specialties data:', specialties);
    
    if (!Array.isArray(specialties)) {
      return NextResponse.json({ mainCategories: [], subcategories: [] });
    }
    
    // Separate main categories from subcategories
    const result: FormattedSpecialties = {
      mainCategories: specialties.filter(s => s.parent_id === null),
      subcategories: specialties.filter(s => s.parent_id !== null)
    };
    
    // Sort subcategories alphabetically
    result.subcategories.sort((a, b) => a.name.localeCompare(b.name));
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching place specialties:', error);
    return NextResponse.json({ error: 'Failed to fetch specialties' }, { status: 500 });
  }
}

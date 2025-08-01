import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

interface SpecialtyCount {
  id: number;
  name: string;
  parent_id: number | null;
  place_count: number;
}

export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    
    // Get counts of places per specialty
    const counts = await db.all(`
      SELECT 
        s.id, 
        s.name,
        s.parent_id,
        COUNT(DISTINCT ps.place_id) as place_count
      FROM 
        specialties s
      LEFT JOIN 
        place_specialties ps ON s.id = ps.specialty_id
      GROUP BY 
        s.id
      ORDER BY 
        s.name
    `);
    
    // Ensure counts is an array
    if (!Array.isArray(counts)) {
      console.warn('Expected array of counts but got:', typeof counts);
      return NextResponse.json([]);
    }
    
    return NextResponse.json(counts);
  } catch (error) {
    console.error('Error in GET /api/specialty-counts:', error);
    return NextResponse.json([], { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// GET /api/types - Get all place types
export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    const result = await db.all('SELECT id, name FROM place_types ORDER BY name');
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to fetch place types:', error);
    return NextResponse.json(
      { message: 'Failed to fetch place types' },
      { status: 500 }
    );
  }
}

// POST /api/types - Create a new place type
export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json();
    
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { message: 'Name is required' },
        { status: 400 }
      );
    }
    
    // Check if the type already exists
    const db = await getDb();
    const existingType = await db.all(
      'SELECT id FROM place_types WHERE LOWER(name) = LOWER(?)',
      [name.trim()]
    );
    
    if (existingType.length > 0) {
      return NextResponse.json(
        { message: 'A place type with this name already exists' },
        { status: 409 }
      );
    }
    
    // Insert the new place type
    const result = await db.run(
      'INSERT INTO place_types (name) VALUES (?)',
      [name.trim()]
    );
    
    // Get the newly created item
    const newItem = await db.get('SELECT id, name FROM place_types WHERE id = ?', result.lastID);
    
    return NextResponse.json(newItem, { status: 201 });
  } catch (error) {
    console.error('Failed to create place type:', error);
    return NextResponse.json(
      { message: 'Failed to create place type' },
      { status: 500 }
    );
  }
}

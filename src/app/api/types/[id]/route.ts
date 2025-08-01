import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/types/:id - Get a specific place type
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { message: 'Invalid ID format' },
        { status: 400 }
      );
    }
    
    const result = await db.query(
      'SELECT id, name FROM place_types WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { message: 'Place type not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Failed to fetch place type:', error);
    return NextResponse.json(
      { message: 'Failed to fetch place type' },
      { status: 500 }
    );
  }
}

// PUT /api/types/:id - Update a place type
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { message: 'Invalid ID format' },
        { status: 400 }
      );
    }
    
    const { name } = await request.json();
    
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { message: 'Name is required' },
        { status: 400 }
      );
    }
    
    // Check if the place type exists
    const typeExists = await db.query(
      'SELECT id FROM place_types WHERE id = $1',
      [id]
    );
    
    if (typeExists.rows.length === 0) {
      return NextResponse.json(
        { message: 'Place type not found' },
        { status: 404 }
      );
    }
    
    // Check if the new name already exists (excluding the current type)
    const nameExists = await db.query(
      'SELECT id FROM place_types WHERE LOWER(name) = LOWER($1) AND id != $2',
      [name.trim(), id]
    );
    
    if (nameExists.rows.length > 0) {
      return NextResponse.json(
        { message: 'A place type with this name already exists' },
        { status: 409 }
      );
    }
    
    // Update the place type
    const result = await db.query(
      'UPDATE place_types SET name = $1 WHERE id = $2 RETURNING id, name',
      [name.trim(), id]
    );
    
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Failed to update place type:', error);
    return NextResponse.json(
      { message: 'Failed to update place type' },
      { status: 500 }
    );
  }
}

// DELETE /api/types/:id - Delete a place type
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { message: 'Invalid ID format' },
        { status: 400 }
      );
    }
    
    // Check if there are places using this type
    const placesCheck = await db.query(
      'SELECT COUNT(*) FROM places WHERE type_id = $1',
      [id]
    );
    
    if (parseInt(placesCheck.rows[0].count) > 0) {
      return NextResponse.json(
        { message: 'Cannot delete a place type that is in use. Please reassign places to another type first.' },
        { status: 409 }
      );
    }
    
    // Delete the place type
    const result = await db.query(
      'DELETE FROM place_types WHERE id = $1 RETURNING id',
      [id]
    );
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { message: 'Place type not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ message: 'Place type deleted successfully' });
  } catch (error) {
    console.error('Failed to delete place type:', error);
    return NextResponse.json(
      { message: 'Failed to delete place type' },
      { status: 500 }
    );
  }
}

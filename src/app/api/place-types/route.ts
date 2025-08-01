import { NextRequest, NextResponse } from 'next/server';
import { 
  getPlaceTypes, 
  getPlaceTypeById, 
  createPlaceType, 
  updatePlaceType, 
  deletePlaceType 
} from '@/lib/data-utils';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (id) {
      const placeType = await getPlaceTypeById(parseInt(id));
      if (!placeType) {
        return NextResponse.json({ error: 'Place type not found' }, { status: 404 });
      }
      return NextResponse.json(placeType);
    }
    
    const placeTypes = await getPlaceTypes();
    return NextResponse.json(placeTypes);
  } catch (error) {
    console.error('Error in GET /api/place-types:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    if (!data.name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    
    // Check if a place type with this name already exists
    const db = await getDb();
    const existingType = await db.get('SELECT id FROM place_types WHERE name = ?', data.name);
    
    if (existingType) {
      return NextResponse.json({ 
        error: `A category with the name "${data.name}" already exists` 
      }, { status: 400 });
    }
    
    // Create place type
    const id = await createPlaceType(data.name, data.description || '');
    
    return NextResponse.json({ id, success: true }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/place-types:', error);
    let errorMessage = 'Internal Server Error';
    
    // Check for unique constraint violation
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      errorMessage = `A category with this name already exists`;
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }
    
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Missing place type ID' }, { status: 400 });
    }
    
    const data = await request.json();
    
    // Validate required fields
    if (!data.name) {
      return NextResponse.json({ error: 'Missing required field: name' }, { status: 400 });
    }
    
    // Update place type
    const success = updatePlaceType(parseInt(id), data.name, data.description || '');
    
    if (!success) {
      return NextResponse.json({ error: 'Place type not found' }, { status: 404 });
    }
    
    return NextResponse.json({ id, success: true });
  } catch (error) {
    console.error('Error in PUT /api/place-types:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Missing place type ID' }, { status: 400 });
    }
    
    try {
      const success = deletePlaceType(parseInt(id));
      
      if (!success) {
        return NextResponse.json({ error: 'Place type not found' }, { status: 404 });
      }
      
      return NextResponse.json({ success: true });
    } catch (error) {
      // Handle specific error for foreign key constraint violation
      if (error instanceof Error && error.message.includes('referenced by places')) {
        return NextResponse.json({ 
          error: 'Cannot delete place type that has places. Delete or reassign these places first.' 
        }, { status: 400 });
      }
      throw error;
    }
  } catch (error) {
    console.error('Error in DELETE /api/place-types:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

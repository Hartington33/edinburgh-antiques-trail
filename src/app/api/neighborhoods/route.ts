import { NextRequest, NextResponse } from 'next/server';
import { 
  getNeighborhoods, 
  getNeighborhoodById, 
  createNeighborhood, 
  updateNeighborhood, 
  deleteNeighborhood 
} from '@/lib/data-utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (id) {
      const neighborhood = await getNeighborhoodById(parseInt(id));
      if (!neighborhood) {
        return NextResponse.json({ error: 'Neighborhood not found' }, { status: 404 });
      }
      return NextResponse.json(neighborhood);
    }
    
    const neighborhoods = await getNeighborhoods();
    return NextResponse.json(neighborhoods);
  } catch (error) {
    console.error('Error in GET /api/neighborhoods:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Validate required fields
    if (!data.name) {
      return NextResponse.json({ error: 'Missing required field: name' }, { status: 400 });
    }
    
    // Create neighborhood
    const id = await createNeighborhood(data.name, data.description || '');
    
    return NextResponse.json({ id, success: true }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/neighborhoods:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Missing neighborhood ID' }, { status: 400 });
    }
    
    const data = await request.json();
    
    // Validate required fields
    if (!data.name) {
      return NextResponse.json({ error: 'Missing required field: name' }, { status: 400 });
    }
    
    // Update neighborhood
    const success = updateNeighborhood(parseInt(id), data.name, data.description || '');
    
    if (!success) {
      return NextResponse.json({ error: 'Neighborhood not found' }, { status: 404 });
    }
    
    return NextResponse.json({ id, success: true });
  } catch (error) {
    console.error('Error in PUT /api/neighborhoods:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Missing neighborhood ID' }, { status: 400 });
    }
    
    try {
      const success = deleteNeighborhood(parseInt(id));
      
      if (!success) {
        return NextResponse.json({ error: 'Neighborhood not found' }, { status: 404 });
      }
      
      return NextResponse.json({ success: true });
    } catch (error) {
      // Handle specific error for foreign key constraint violation
      if (error instanceof Error && error.message.includes('referenced by places')) {
        return NextResponse.json({ 
          error: 'Cannot delete neighborhood that has places. Delete or reassign these places first.' 
        }, { status: 400 });
      }
      throw error;
    }
  } catch (error) {
    console.error('Error in DELETE /api/neighborhoods:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

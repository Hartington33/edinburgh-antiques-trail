import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    if (!data.placeId || !data.requestText) {
      return NextResponse.json({ 
        error: 'Missing required fields: placeId and requestText' 
      }, { status: 400 });
    }
    
    const { placeId, requestText } = data;
    const db = await getDb();
    
    // Insert the specialty request
    await db.run(
      'INSERT INTO specialty_requests (place_id, request_text) VALUES (?, ?)',
      placeId, requestText
    );
    
    return NextResponse.json({ 
      success: true,
      message: 'Specialty request submitted successfully.'
    });
    
  } catch (error) {
    console.error('Error in POST /api/specialty-requests:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const placeId = searchParams.get('place_id');
    const status = searchParams.get('status') || 'pending';
    
    const db = await getDb();
    let query = 'SELECT * FROM specialty_requests WHERE 1=1';
    const params: any[] = [];
    
    if (placeId) {
      query += ' AND place_id = ?';
      params.push(placeId);
    }
    
    if (status !== 'all') {
      query += ' AND status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const requests = await db.all(query, params);
    
    return NextResponse.json(requests);
    
  } catch (error) {
    console.error('Error in GET /api/specialty-requests:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

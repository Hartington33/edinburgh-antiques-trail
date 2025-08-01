import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    if (!data.specialtyId) {
      return NextResponse.json({ 
        error: 'Missing required field: specialtyId' 
      }, { status: 400 });
    }
    
    const { specialtyId } = data;
    // Get IP address and session ID if available
    const userIp = request.headers.get('x-forwarded-for') || request.ip || 'unknown';
    const sessionId = request.cookies.get('session_id')?.value || null;
    
    const db = await getDb();
    
    // Log the specialty search
    await db.run(
      'INSERT INTO specialty_searches (specialty_id, user_ip, session_id) VALUES (?, ?, ?)',
      specialtyId, userIp, sessionId
    );
    
    // Return success without sending back sensitive information
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Error in POST /api/specialty-searches:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Get analytics for specialty searches
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    
    const db = await getDb();
    
    // Get top searched specialties in the last X days
    const topSearches = await db.all(`
      SELECT 
        sp.id, 
        sp.name,
        sp.parent_id,
        COUNT(*) as search_count
      FROM specialty_searches ss
      JOIN specialties sp ON ss.specialty_id = sp.id
      WHERE ss.search_timestamp >= datetime('now', '-' || ? || ' days')
      GROUP BY ss.specialty_id
      ORDER BY search_count DESC
      LIMIT ?
    `, [days, limit]);
    
    // Get total count of searches
    const totalCount = await db.get(`
      SELECT COUNT(*) as total
      FROM specialty_searches
      WHERE search_timestamp >= datetime('now', '-' || ? || ' days')
    `, [days]);
    
    return NextResponse.json({
      top_searches: topSearches,
      total_searches: totalCount.total,
      days: days
    });
    
  } catch (error) {
    console.error('Error in GET /api/specialty-searches:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

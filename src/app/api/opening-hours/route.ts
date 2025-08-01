import { NextRequest, NextResponse } from 'next/server';
import { getOpeningHoursByPlaceId, isPlaceCurrentlyOpen, willPlaceCloseSoon, formatGroupedOpeningHours } from '@/lib/opening-hours-utils';
import { getDb } from '@/lib/db';

// Helper function to validate time format
function validateTimeFormat(time: string | null): boolean {
  if (!time) return true; // null is valid
  
  // Check if it's a special case
  if (time === 'By appointment only' || time === 'Closed') return true;
  
  // Basic time format validation - now allows leading zeros
  return /^\d{1,2}(:\d{2})?$/.test(time) || /^0\d(:\d{2})?$/.test(time);
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const placeIdParam = searchParams.get('placeId') || searchParams.get('place_id');

  if (!placeIdParam) {
    return NextResponse.json(
      { error: 'Place ID is required' },
      { status: 400 }
    );
  }
  
  try {
    const placeId = parseInt(placeIdParam);
    const openingHours = await getOpeningHoursByPlaceId(placeId);
    
    // Also get current open status
    const isOpen = await isPlaceCurrentlyOpen(placeId);
    const closingSoon = await willPlaceCloseSoon(placeId);
    
    // Format the hours with grouped days
    const formattedGroups = formatGroupedOpeningHours(openingHours);
    
    // Return both raw hours and formatted groups
    return NextResponse.json({
      raw: openingHours,
      formatted: formattedGroups,
      status: {
        isOpen,
        closingSoon
      }
    });
  } catch (error) {
    console.error('Error fetching opening hours:', error);
    return NextResponse.json(
      { error: 'Failed to fetch opening hours' },
      { status: 500 }
    );
  }
}

// Update or create opening hours
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Support both placeId and place_id for compatibility
    const placeId = body.placeId || body.place_id;
    
    // For single opening hour entry
    if (placeId && body.day_of_week !== undefined) {
      const hour = body;
      const db = await getDb();
      
      await db.run(
        `INSERT INTO opening_hours (
          place_id, day_of_week, open_time, close_time, is_closed, is_by_appointment, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          placeId,
          hour.day_of_week,
          hour.open_time,
          hour.close_time,
          hour.is_closed ? 1 : 0,
          hour.is_by_appointment ? 1 : 0,
          hour.notes || ''
        ]
      );
      
      await updateFormattedOpeningHours(placeId);
      return NextResponse.json({ success: true });
    }
    
    // For batch hours update
    const hours = body.hours;
    if (!placeId || (!hours && body.day_of_week === undefined)) {
      return NextResponse.json(
        { error: 'Invalid request format. Place ID and hours information required.' },
        { status: 400 }
      );
    }
    
    // Validate time formats - prevent saving times with leading zeros
    for (const hour of hours) {
      if (!validateTimeFormat(hour.open_time) || !validateTimeFormat(hour.close_time)) {
        return NextResponse.json(
          { error: 'Invalid time format. Times should not have leading zeros.' },
          { status: 400 }
        );
      }
    }
    
    const db = await getDb();
    
    // First delete existing hours
    await db.run('DELETE FROM opening_hours WHERE place_id = ?', [placeId]);
    
    // Then insert new hours
    for (const hour of hours) {
      await db.run(
        `INSERT INTO opening_hours (
          place_id, day_of_week, open_time, close_time, is_closed, is_by_appointment, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          placeId,
          hour.day_of_week,
          hour.open_time,
          hour.close_time,
          hour.is_closed ? 1 : 0,
          hour.is_by_appointment ? 1 : 0,
          hour.notes || ''
        ]
      );
    }
    
    // Update the formatted opening hours in the places table
    await updateFormattedOpeningHours(placeId);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating opening hours:', error);
    return NextResponse.json(
      { error: 'Failed to update opening hours' },
      { status: 500 }
    );
  }
}

// Delete all opening hours for a place
export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const placeIdParam = searchParams.get('placeId') || searchParams.get('place_id');

  if (!placeIdParam) {
    return NextResponse.json(
      { error: 'Place ID is required' },
      { status: 400 }
    );
  }
  
  try {
    const placeId = parseInt(placeIdParam);
    const db = await getDb();
    await db.run('DELETE FROM opening_hours WHERE place_id = ?', [placeId]);
    
    // Update the formatted opening hours in the places table
    await updateFormattedOpeningHours(placeId);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting opening hours:', error);
    return NextResponse.json(
      { error: 'Failed to delete opening hours' },
      { status: 500 }
    );
  }
}

// Helper function to update the formatted opening hours in the places table
async function updateFormattedOpeningHours(placeId: number) {
  try {
    const db = await getDb();
    
    // Get all opening hours for this place
    const hours = await db.all(
      'SELECT * FROM opening_hours WHERE place_id = ? ORDER BY day_of_week',
      [placeId]
    );
    
    // Format the hours into a string
    let formattedHours = '';
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    for (let i = 0; i < hours.length; i++) {
      const hour = hours[i];
      const dayIndex = Number(hour.day_of_week);
      let dayStr = days[dayIndex];
      let timeStr = '';
      
      if (hour.is_closed) {
        timeStr = 'Closed';
      } else if (hour.is_by_appointment) {
        timeStr = 'By appointment only';
      } else if (hour.open_time && hour.close_time) {
        timeStr = `${hour.open_time}-${hour.close_time}`;
      }
      
      if (timeStr) {
        formattedHours += `${dayStr}: ${timeStr}\n`;
      }
    }
    
    // Update the formatted hours in the places table
    await db.run(
      'UPDATE places SET opening_hours = ? WHERE id = ?',
      [formattedHours.trim(), placeId]
    );
    
    // After updating hours, also update the opening status flags
    // This is crucial for the UI to correctly show open/closed status
    const isOpen = await isPlaceCurrentlyOpen(placeId);
    const closingSoon = await willPlaceCloseSoon(placeId);
    
    // Update the place status fields if they exist
    // First check if the columns exist
    const tableInfo = await db.all("PRAGMA table_info(places)");
    const hasStatusColumns = tableInfo.some(col => col.name === 'is_open' || col.name === 'closing_soon');
    
    if (hasStatusColumns) {
      await db.run(
        'UPDATE places SET is_open = ?, closing_soon = ? WHERE id = ?',
        [isOpen ? 1 : 0, closingSoon ? 1 : 0, placeId]
      );
    }
    
    console.log(`Place ${placeId} hours updated. Status: ${isOpen ? 'Open' : 'Closed'}${closingSoon ? ', Closing Soon' : ''}`);
  } catch (error) {
    console.error('Error updating formatted opening hours:', error);
  }
}
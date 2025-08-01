import { NextRequest, NextResponse } from 'next/server';
import { getOnlineSalesLinksByPlaceId } from '@/lib/online-sales-utils';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const placeId = searchParams.get('placeId');

  if (!placeId) {
    return NextResponse.json(
      { error: 'Place ID is required' },
      { status: 400 }
    );
  }

  try {
    const placeIdNum = parseInt(placeId);
    const onlineSalesLinks = await getOnlineSalesLinksByPlaceId(placeIdNum);
    
    return NextResponse.json(onlineSalesLinks);
  } catch (error) {
    console.error('Error fetching online sales links:', error);
    return NextResponse.json(
      { error: 'Failed to fetch online sales links' },
      { status: 500 }
    );
  }
}
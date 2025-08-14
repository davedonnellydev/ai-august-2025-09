import { NextRequest, NextResponse } from 'next/server';
import { syncByLabel } from '../../../lib/email/syncByLabel';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const label = searchParams.get('label');
    const max = searchParams.get('max');

    if (!label) {
      return NextResponse.json(
        { error: 'Missing required parameter: label' },
        { status: 400 }
      );
    }

    const maxFetch = max ? parseInt(max, 10) : 10;

    if (isNaN(maxFetch) || maxFetch < 1 || maxFetch > 100) {
      return NextResponse.json(
        { error: 'Invalid max parameter. Must be a number between 1 and 100' },
        { status: 400 }
      );
    }

    // Hardcoded user ID for testing as requested
    const userId = '2d30743e-10cb-4490-933c-4ccdf37364e9';

    console.log('Starting Gmail sync by label:', {
      userId,
      label,
      maxFetch,
      timestamp: new Date().toISOString(),
    });

    const summary = await syncByLabel({
      userId,
      label,
      maxFetch,
    });

    console.log('Gmail sync completed:', {
      userId,
      label,
      summary,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Gmail sync completed successfully',
      data: {
        userId,
        label,
        maxFetch,
        summary,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Gmail sync endpoint error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to sync Gmail messages',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

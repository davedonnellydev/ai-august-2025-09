import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/app/lib/auth/session';

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    
    if (!userId) {
      return NextResponse.json(
        { 
          authenticated: false, 
          message: 'No active session found' 
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      authenticated: true,
      userId,
      message: 'Session found',
    });
  } catch (error) {
    console.error('Session endpoint error:', error);
    return NextResponse.json(
      { 
        authenticated: false, 
        error: 'Failed to get session' 
      },
      { status: 500 }
    );
  }
}

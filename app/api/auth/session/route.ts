import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../auth';

export async function GET(_request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          authenticated: false,
          message: 'No active session found',
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      authenticated: true,
      userId: session.user.id,
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
      },
      message: 'Session found',
    });
  } catch (error) {
    console.error('Session API error:', error);
    
    // Return 401 for auth errors, not 500
    return NextResponse.json(
      {
        authenticated: false,
        message: 'Authentication check failed',
      },
      { status: 401 }
    );
  }
}

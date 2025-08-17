import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../auth';

export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    
    return NextResponse.json({
      session: session ? {
        hasUser: !!session.user,
        userId: session.user?.id,
        email: session.user?.email,
        name: session.user?.name,
      } : null,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
        hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
        nextAuthUrl: process.env.NEXTAUTH_URL,
        hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
        hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
        hasDatabaseUrl: !!process.env.DATABASE_URL,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Auth debug error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get auth debug info',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';

export async function GET(_request: NextRequest) {
  try {
    // Check environment variables (without exposing sensitive data)
    const hasClientId = !!process.env.GOOGLE_CLIENT_ID;
    const hasClientSecret = !!process.env.GOOGLE_CLIENT_SECRET;
    const hasNextAuthSecret = !!process.env.NEXTAUTH_SECRET;
    const hasNextAuthUrl = !!process.env.NEXTAUTH_URL;
    const hasDatabaseUrl = !!process.env.DATABASE_URL;

    return NextResponse.json({
      nextauth: {
        hasSecret: hasNextAuthSecret,
        hasUrl: hasNextAuthUrl,
        url: process.env.NEXTAUTH_URL || 'NOT SET',
      },
      google: {
        hasClientId,
        hasClientSecret,
        clientIdPrefix: process.env.GOOGLE_CLIENT_ID
          ? `${process.env.GOOGLE_CLIENT_ID.substring(0, 20)}...`
          : 'NOT SET',
      },
      database: {
        hasDatabaseUrl,
        urlPrefix: process.env.DATABASE_URL
          ? `${process.env.DATABASE_URL.substring(0, 30)}...`
          : 'NOT SET',
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        isDevelopment: process.env.NODE_ENV === 'development',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Auth test endpoint error:', error);
    return NextResponse.json(
      { error: 'Failed to get configuration' },
      { status: 500 }
    );
  }
}

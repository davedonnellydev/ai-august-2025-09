import { NextRequest, NextResponse } from 'next/server';
import { GMAIL_SCOPES, GMAIL_REDIRECT_URI } from '../../../../config/gmail';

export async function GET(_request: NextRequest) {
  try {
    // Check environment variables (without exposing sensitive data)
    const hasClientId = !!process.env.GOOGLE_CLIENT_ID;
    const hasClientSecret = !!process.env.GOOGLE_CLIENT_SECRET;
    const hasDatabaseUrl = !!process.env.DATABASE_URL;
    
    return NextResponse.json({
      oauth: {
        hasClientId,
        hasClientSecret,
        redirectUri: GMAIL_REDIRECT_URI,
        scopes: GMAIL_SCOPES,
        clientIdPrefix: process.env.GOOGLE_CLIENT_ID ? 
          `${process.env.GOOGLE_CLIENT_ID.substring(0, 20)}...` : 'NOT SET',
      },
      database: {
        hasDatabaseUrl,
        urlPrefix: process.env.DATABASE_URL ? 
          `${process.env.DATABASE_URL.substring(0, 30)}...` : 'NOT SET',
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        isDevelopment: process.env.NODE_ENV === 'development',
      }
    });
  } catch (error) {
    console.error('Config endpoint error:', error);
    return NextResponse.json(
      { error: 'Failed to get configuration' },
      { status: 500 }
    );
  }
}

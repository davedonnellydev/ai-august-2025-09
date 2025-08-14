import { NextRequest, NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import { GMAIL_SCOPES, GMAIL_REDIRECT_URI } from '../../../../config/gmail';
import { randomBytes } from 'crypto';

export async function GET(_request: NextRequest) {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error('Google OAuth credentials not configured');
      return NextResponse.json(
        { error: 'OAuth not configured' },
        { status: 500 }
      );
    }

    const oauth2Client = new OAuth2Client(
      clientId,
      clientSecret,
      GMAIL_REDIRECT_URI
    );

    // Generate a random state parameter for security
    const state = randomBytes(16).toString('hex');

    // Generate OAuth URL with Gmail scopes and state
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: GMAIL_SCOPES,
      prompt: 'consent', // Force consent to get refresh token
      state,
    });

    console.log('OAuth configuration:', {
      clientId: clientId ? `${clientId.substring(0, 20)}...` : 'NOT SET',
      redirectUri: GMAIL_REDIRECT_URI,
      state,
      scopes: GMAIL_SCOPES,
    });

    console.log(
      'Redirecting to Google OAuth:',
      `${authUrl.substring(0, 100)}...`
    );

    // Redirect user to Google consent screen
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('OAuth start error:', error);
    return NextResponse.json(
      { error: 'Failed to start OAuth flow' },
      { status: 500 }
    );
  }
}

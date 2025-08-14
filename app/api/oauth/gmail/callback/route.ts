import { NextRequest, NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import { db, gmailTokensTable } from '../../../../db';
import { GMAIL_REDIRECT_URI } from '../../../../config/gmail';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Debug: Log all received parameters
    console.log('OAuth callback received:', {
      url: request.url,
      searchParams: Object.fromEntries(searchParams.entries()),
      code: code ? `${code.substring(0, 20)}...` : 'NOT SET',
      state: state ? `${state.substring(0, 20)}...` : 'NOT SET',
      error: error || 'NONE',
    });

    if (error) {
      console.error('OAuth error:', error);
      return NextResponse.json(
        { error: 'OAuth authorization failed' },
        { status: 400 }
      );
    }

    if (!code || !state) {
      console.error('Missing OAuth parameters:', {
        code: !!code,
        state: !!state,
      });
      return NextResponse.json(
        { error: 'Missing required OAuth parameters' },
        { status: 400 }
      );
    }

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

    // Exchange authorization code for tokens
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      console.error('No refresh token received from Google');
      return NextResponse.json(
        { error: 'Failed to obtain refresh token' },
        { status: 500 }
      );
    }

    const userId = '2d30743e-10cb-4490-933c-4ccdf37364e9';

    // Upsert tokens into database
    await db
      .insert(gmailTokensTable)
      .values({
        userId,
        accessToken: tokens.access_token || null,
        refreshToken: tokens.refresh_token,
        expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        scope: tokens.scope || 'https://www.googleapis.com/auth/gmail.readonly',
        tokenType: tokens.token_type || 'Bearer',
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: gmailTokensTable.userId,
        set: {
          accessToken: tokens.access_token || null,
          refreshToken: tokens.refresh_token,
          expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
          scope:
            tokens.scope || 'https://www.googleapis.com/auth/gmail.readonly',
          tokenType: tokens.token_type || 'Bearer',
          updatedAt: new Date(),
        },
      });

    console.log('Gmail tokens stored successfully for user:', userId);

    // Redirect to success page or return success response
    return NextResponse.json({
      message: 'Gmail OAuth completed successfully',
      status: 'success',
      userId,
      hasRefreshToken: !!tokens.refresh_token,
      scope: tokens.scope,
    });
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.json(
      { error: 'Failed to process OAuth callback' },
      { status: 500 }
    );
  }
}

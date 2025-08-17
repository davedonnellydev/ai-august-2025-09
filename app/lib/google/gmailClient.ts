import { OAuth2Client } from 'google-auth-library';
import { gmail_v1, google } from 'googleapis';
import { db, gmailTokensTable } from '../../db';
import { eq } from 'drizzle-orm';

/**
 * Manually refresh Gmail tokens for a user
 * @param userId - User identifier
 * @returns Updated tokens
 */
export async function refreshGmailTokens(userId: string): Promise<{
  accessToken: string;
  expiryDate: Date;
}> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured');
  }

  // Get current tokens from database
  const [tokenRecord] = await db
    .select()
    .from(gmailTokensTable)
    .where(eq(gmailTokensTable.userId, userId))
    .limit(1);

  if (!tokenRecord || !tokenRecord.refreshToken) {
    throw new Error(`No refresh token found for user ${userId}`);
  }

  const oauth2Client = new OAuth2Client(
    clientId,
    clientSecret,
    process.env.GMAIL_REDIRECT_URI
  );

  // Set the refresh token
  oauth2Client.setCredentials({
    refresh_token: tokenRecord.refreshToken,
  });

  try {
    // Refresh the tokens
    const { credentials } = await oauth2Client.refreshAccessToken();
    
    if (!credentials.access_token) {
      throw new Error('Failed to refresh access token');
    }

    // Validate and parse the expiry date
    let expiryDate: Date | null = null;
    if (credentials.expiry_date) {
      try {
        // Google returns expiry_date as seconds since epoch
        const expiryTimestamp = credentials.expiry_date * 1000; // Convert to milliseconds
        
        // Validate the timestamp is reasonable (not in the distant future)
        const maxReasonableDate = Date.now() + (365 * 24 * 60 * 60 * 1000); // 1 year from now
        if (expiryTimestamp > 0 && expiryTimestamp < maxReasonableDate) {
          expiryDate = new Date(expiryTimestamp);
        } else {
          console.warn('Invalid expiry date from Google:', credentials.expiry_date, 'using null instead');
          expiryDate = null;
        }
      } catch (dateError) {
        console.warn('Failed to parse expiry date:', credentials.expiry_date, 'using null instead');
        expiryDate = null;
      }
    }

    console.log('Refreshed token details:', {
      hasAccessToken: !!credentials.access_token,
      accessTokenLength: credentials.access_token?.length || 0,
      originalExpiryDate: credentials.expiry_date,
      parsedExpiryDate: expiryDate,
      scope: credentials.scope,
    });

    // Update tokens in database
    const [updatedToken] = await db
      .update(gmailTokensTable)
      .set({
        accessToken: credentials.access_token,
        expiryDate: expiryDate,
        updatedAt: new Date(),
      })
      .where(eq(gmailTokensTable.userId, userId))
      .returning();

    console.log('Tokens manually refreshed for user:', userId);

    return {
      accessToken: credentials.access_token,
      expiryDate: updatedToken.expiryDate || new Date(),
    };
  } catch (error) {
    console.error('Failed to refresh tokens for user:', userId, error);
    throw new Error(`Token refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get Gmail OAuth client instance for a specific user
 * @param userId - User identifier
 * @returns OAuth2Client instance for Gmail
 */
export async function getGmailOAuthClient(
  userId: string
): Promise<OAuth2Client> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured');
  }

  const oauth2Client = new OAuth2Client(
    clientId,
    clientSecret,
    process.env.GMAIL_REDIRECT_URI
  );

  // Load refresh token from database
  const tokenRecord = await db
    .select()
    .from(gmailTokensTable)
    .where(eq(gmailTokensTable.userId, userId))
    .limit(1);

  if (tokenRecord.length === 0) {
    throw new Error(`No Gmail tokens found for user ${userId}`);
  }

  const tokens = {
    access_token: tokenRecord[0].accessToken,
    refresh_token: tokenRecord[0].refreshToken,
    expiry_date: tokenRecord[0].expiryDate
      ? tokenRecord[0].expiryDate.getTime() / 1000 // Convert to seconds for Google's format
      : null,
    scope: tokenRecord[0].scope,
    token_type: tokenRecord[0].tokenType,
  };

  console.log('Setting OAuth credentials for user:', userId, {
    hasAccessToken: !!tokens.access_token,
    hasRefreshToken: !!tokens.refresh_token,
    expiryDate: tokens.expiry_date,
    scope: tokens.scope,
    accessTokenLength: tokens.access_token?.length || 0,
    refreshTokenLength: tokens.refresh_token?.length || 0,
  });

  oauth2Client.setCredentials(tokens);

  // Verify credentials were set
  const currentCredentials = oauth2Client.credentials;
  console.log('OAuth client credentials after setCredentials:', {
    hasAccessToken: !!currentCredentials.access_token,
    hasRefreshToken: !!currentCredentials.refresh_token,
    expiryDate: currentCredentials.expiry_date,
    scope: currentCredentials.scope,
    tokenType: currentCredentials.token_type,
  });

  // Set up automatic token refresh
  oauth2Client.on('tokens', async (newTokens) => {
    console.log('Token refresh event triggered for user:', userId);
    
    try {
      // Update tokens in database
      await db
        .update(gmailTokensTable)
        .set({
          accessToken: newTokens.access_token || tokenRecord[0].accessToken,
          expiryDate: newTokens.expiry_date 
            ? new Date(newTokens.expiry_date * 1000)
            : tokenRecord[0].expiryDate,
          updatedAt: new Date(),
        })
        .where(eq(gmailTokensTable.userId, userId));

      console.log('Tokens updated in database for user:', userId);
    } catch (error) {
      console.error('Failed to update tokens in database for user:', userId, error);
    }
  });

  return oauth2Client;
}

/**
 * Get Gmail service instance for a specific user
 * @param userId - User identifier
 * @returns Gmail service for API calls
 */
export async function getGmail(userId: string): Promise<gmail_v1.Gmail> {
  try {
    const oauth2Client = await getGmailOAuthClient(userId);
    
    // Create Gmail service with explicit auth
    const gmail = google.gmail({ 
      version: 'v1', 
      auth: oauth2Client 
    });

    // Test authentication by making a simple API call
    try {
      console.log('Testing Gmail authentication for user:', userId);
      
      // Use a very simple API call to test authentication
      const profileResponse = await gmail.users.getProfile({ userId: 'me' });
      console.log('Gmail authentication test successful for user:', userId, {
        emailAddress: profileResponse.data.emailAddress,
        messagesTotal: profileResponse.data.messagesTotal,
        threadsTotal: profileResponse.data.threadsTotal,
      });
      
    } catch (authError) {
      console.error('Gmail authentication test failed for user:', userId, {
        error: authError instanceof Error ? authError.message : 'Unknown error',
        status: (authError as any)?.response?.status,
        code: (authError as any)?.code,
      });
      
      // If it's an auth error, try to refresh tokens
      if (authError instanceof Error && 
          (authError.message.includes('invalid_grant') || 
           authError.message.includes('token') ||
           authError.message.includes('expired') ||
           authError.message.includes('authentication') ||
           authError.message.includes('credential'))) {
        
        console.log('Attempting to refresh expired tokens for user:', userId);
        try {
          await refreshGmailTokens(userId);
          
          // Try again with refreshed tokens
          const refreshedOAuth2Client = await getGmailOAuthClient(userId);
          const refreshedGmail = google.gmail({ 
            version: 'v1', 
            auth: refreshedOAuth2Client 
          });
          
          // Test authentication again
          console.log('Testing Gmail authentication after token refresh for user:', userId);
          await refreshedGmail.users.getProfile({ userId: 'me' });
          console.log('Gmail authentication test successful after token refresh for user:', userId);
          
          return refreshedGmail;
        } catch (refreshError) {
          console.error('Token refresh failed for user:', userId, refreshError);
          throw new Error(`Authentication failed even after token refresh: ${refreshError instanceof Error ? refreshError.message : 'Unknown error'}`);
        }
      }
      
      throw authError;
    }

    return gmail;
  } catch (error) {
    console.error('Failed to get Gmail service for user:', userId, error);
    throw error;
  }
}

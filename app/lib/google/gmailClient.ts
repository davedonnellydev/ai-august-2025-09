import { OAuth2Client } from 'google-auth-library';
import { gmail_v1, google } from 'googleapis';
import { db, gmailTokensTable } from '../../db';
import { eq } from 'drizzle-orm';

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
      ? tokenRecord[0].expiryDate.getTime()
      : null,
    scope: tokenRecord[0].scope,
    token_type: tokenRecord[0].tokenType,
  };

  oauth2Client.setCredentials(tokens);
  return oauth2Client;
}

/**
 * Get Gmail service instance for a specific user
 * @param userId - User identifier
 * @returns Gmail service for API calls
 */
export async function getGmail(userId: string): Promise<gmail_v1.Gmail> {
  const oauth2Client = await getGmailOAuthClient(userId);
  return google.gmail({ version: 'v1', auth: oauth2Client });
}

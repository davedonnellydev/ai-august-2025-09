import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../auth';
import { db, gmailTokensTable, gmailLabelsCacheTable } from '../../../../db';
import { eq } from 'drizzle-orm';

export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Check Gmail tokens
    const [gmailToken] = await db
      .select()
      .from(gmailTokensTable)
      .where(eq(gmailTokensTable.userId, userId))
      .limit(1);

    // Check existing cached labels
    const cachedLabels = await db
      .select()
      .from(gmailLabelsCacheTable)
      .where(eq(gmailLabelsCacheTable.userId, userId));

    // Check environment variables
    const envCheck = {
      hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
      hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      hasGmailRedirectUri: !!process.env.GMAIL_REDIRECT_URI,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
    };

    return NextResponse.json({
      debug: {
        userId,
        session: {
          hasUser: !!session.user,
          email: session.user.email,
          name: session.user.name,
        },
        gmailToken: gmailToken ? {
          hasAccessToken: !!gmailToken.accessToken,
          hasRefreshToken: !!gmailToken.refreshToken,
          scope: gmailToken.scope,
          tokenType: gmailToken.tokenType,
          updatedAt: gmailToken.updatedAt,
        } : null,
        cachedLabels: {
          count: cachedLabels.length,
          labels: cachedLabels.map(label => ({
            id: label.providerLabelId,
            name: label.name,
            type: label.type,
          })),
        },
        environment: envCheck,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Gmail debug error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get debug info',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

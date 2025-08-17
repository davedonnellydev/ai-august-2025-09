import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../auth';
import { db, usersTable, gmailTokensTable } from '../../../db';
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

    // Get user data from database
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    // Get Gmail tokens from database
    const [gmailToken] = await db
      .select()
      .from(gmailTokensTable)
      .where(eq(gmailTokensTable.userId, userId))
      .limit(1);

    return NextResponse.json({
      session: {
        userId: session.user.id,
        email: session.user.email,
        name: session.user.name,
      },
      database: {
        user: user ? {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          createdAt: user.createdAt,
        } : null,
        gmailToken: gmailToken ? {
          hasAccessToken: !!gmailToken.accessToken,
          hasRefreshToken: !!gmailToken.refreshToken,
          scope: gmailToken.scope,
          tokenType: gmailToken.tokenType,
          updatedAt: gmailToken.updatedAt,
        } : null,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Verify user error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to verify user data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

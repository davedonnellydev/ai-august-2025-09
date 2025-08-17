import { NextRequest, NextResponse } from 'next/server';
import { db, usersTable, gmailTokensTable } from '../../../db';

export async function GET(_request: NextRequest) {
  try {
    // Get all users (for debugging)
    const users = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        displayName: usersTable.displayName,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .limit(10);

    // Get all Gmail tokens (for debugging)
    const gmailTokens = await db
      .select({
        userId: gmailTokensTable.userId,
        hasAccessToken: !!gmailTokensTable.accessToken,
        hasRefreshToken: !!gmailTokensTable.refreshToken,
        scope: gmailTokensTable.scope,
        updatedAt: gmailTokensTable.updatedAt,
      })
      .from(gmailTokensTable)
      .limit(10);

    return NextResponse.json({
      database: {
        users: users,
        gmailTokens: gmailTokens,
        userCount: users.length,
        tokenCount: gmailTokens.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Database check error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check database',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

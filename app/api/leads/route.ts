import { NextRequest, NextResponse } from 'next/server';
import { db, jobLeadUrlsTable } from '../../db';
import { getCurrentUserId } from '../../lib/auth/session';
import { eq, and, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Get current user ID from session
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    // Build query conditions
    const conditions = [eq(jobLeadUrlsTable.userId, userId)];

    if (status) {
      conditions.push(eq(jobLeadUrlsTable.status, status as any));
    }

    // Query leads for the current user
    const leads = await db
      .select({
        id: jobLeadUrlsTable.id,
        url: jobLeadUrlsTable.url,
        type: jobLeadUrlsTable.type,
        title: jobLeadUrlsTable.title,
        company: jobLeadUrlsTable.company,
        location: jobLeadUrlsTable.location,
        status: jobLeadUrlsTable.status,
        createdAt: jobLeadUrlsTable.createdAt,
      })
      .from(jobLeadUrlsTable)
      .where(and(...conditions))
      .orderBy(desc(jobLeadUrlsTable.createdAt));

    return NextResponse.json({
      leads,
      count: leads.length,
    });
  } catch (error) {
    console.error('Error fetching leads:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

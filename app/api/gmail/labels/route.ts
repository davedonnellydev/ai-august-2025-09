import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../auth';
import { db, gmailLabelsCacheTable } from '../../../db';
import { eq } from 'drizzle-orm';

export async function GET(_request: NextRequest) {
  try {
    // Get current user session
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Fetch cached labels for the user
    const labels = await db
      .select({
        id: gmailLabelsCacheTable.providerLabelId,
        name: gmailLabelsCacheTable.name,
        type: gmailLabelsCacheTable.type,
        createdAt: gmailLabelsCacheTable.createdAt,
        updatedAt: gmailLabelsCacheTable.updatedAt,
      })
      .from(gmailLabelsCacheTable)
      .where(eq(gmailLabelsCacheTable.userId, userId))
      .orderBy(gmailLabelsCacheTable.name);

    return NextResponse.json({
      labels,
      count: labels.length,
    });
  } catch (error) {
    // Log error for debugging but don't expose in response
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

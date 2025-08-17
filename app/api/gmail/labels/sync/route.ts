import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../auth';
import { db, gmailLabelsCacheTable, gmailTokensTable } from '../../../../db';
import { eq, and } from 'drizzle-orm';
import { getGmail } from '../../../../lib/google/gmailClient';

export async function POST(request: NextRequest) {
  try {
    // Get current user session
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Check if user has Gmail tokens
    const [gmailToken] = await db
      .select()
      .from(gmailTokensTable)
      .where(eq(gmailTokensTable.userId, userId))
      .limit(1);

    if (!gmailToken) {
      return NextResponse.json(
        {
          error:
            'Gmail not connected. Please connect your Gmail account first.',
        },
        { status: 400 }
      );
    }

    // Get Gmail client
    const gmail = await getGmail(userId);

    // Fetch labels from Gmail
    const labelsResponse = await gmail.users.labels.list({
      userId: 'me',
    });

    const labels = labelsResponse.data.labels || [];

    if (labels.length === 0) {
      return NextResponse.json({
        message: 'No labels found',
        synced: 0,
      });
    }

    // Clear existing cached labels for this user
    await db
      .delete(gmailLabelsCacheTable)
      .where(eq(gmailLabelsCacheTable.userId, userId));

    // Insert new labels into cache
    const labelsToInsert = labels.map((label) => ({
      userId,
      providerLabelId: label.id!,
      name: label.name!,
      type: label.type || 'user',
    }));

    if (labelsToInsert.length > 0) {
      await db.insert(gmailLabelsCacheTable).values(labelsToInsert);
    }

    return NextResponse.json({
      message: 'Labels synced successfully',
      synced: labelsToInsert.length,
      labels: labelsToInsert.map((label) => ({
        id: label.providerLabelId,
        name: label.name,
        type: label.type,
      })),
    });
  } catch (error) {
    console.error('Error syncing Gmail labels:', error);
    return NextResponse.json(
      { error: 'Failed to sync labels. Please try again.' },
      { status: 500 }
    );
  }
}

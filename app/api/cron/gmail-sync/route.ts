import { NextRequest, NextResponse } from 'next/server';
import { syncByHistory } from '../../../lib/google/historySync';
import { syncByLabel } from '../../../lib/email/syncByLabel';
import { createSyncState } from '../../../lib/email/syncState';

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      console.error('Invalid cron authorization');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Hardcoded user ID and label for testing
    const userId = '2d30743e-10cb-4490-933c-4ccdf37364e9';
    const label = 'Label_969329089524850868';

    console.log('Starting Gmail cron sync:', {
      userId,
      label,
      timestamp: new Date().toISOString(),
    });

    // Step 1: Try history sync first
    const historyResult = await syncByHistory({ userId, label });

    if (historyResult.usedFallback) {
      console.log('History sync not available, falling back to label scan');

      // Step 2: Fall back to label scanning
      const labelResult = await syncByLabel({
        userId,
        label,
        maxFetch: 50, // Process more messages on fallback
      });

      // If this is the first run, create sync state with current history ID
      if (labelResult.scanned > 0) {
        try {
          // Get the latest history ID from Gmail API
          const { getGmail } = await import('../../../lib/google/gmailClient');
          const gmail = await getGmail(userId);

          // Get the latest history ID by fetching a recent message
          const listResponse = await gmail.users.messages.list({
            userId: 'me',
            labelIds: [label],
            maxResults: 1,
          });

          if (
            listResponse.data.messages &&
            listResponse.data.messages.length > 0
          ) {
            const messageId = listResponse.data.messages[0].id;
            if (messageId) {
              const messageResponse = await gmail.users.messages.get({
                userId: 'me',
                id: messageId,
                format: 'metadata',
                metadataHeaders: ['historyId'],
              });

              const historyId = messageResponse.data.historyId;
              if (historyId) {
                await createSyncState(userId, historyId);
                console.log(`Created sync state with history ID: ${historyId}`);
              }
            }
          }
        } catch (error) {
          console.warn('Failed to create initial sync state:', error);
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Gmail sync completed (label scan fallback)',
        data: {
          method: 'label_scan',
          userId,
          label,
          summary: labelResult,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // History sync was successful
    return NextResponse.json({
      success: true,
      message: 'Gmail sync completed (history API)',
      data: {
        method: 'history_api',
        userId,
        label,
        summary: historyResult,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Gmail cron sync error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to sync Gmail messages',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

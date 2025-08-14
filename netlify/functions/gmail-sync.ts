import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { syncByHistory } from '../../app/lib/google/historySync';
import { syncByLabel } from '../../app/lib/email/syncByLabel';
import { createSyncState } from '../../app/lib/email/syncState';

interface SyncResponse {
  success: boolean;
  message: string;
  data: {
    method: 'history_api' | 'label_scan';
    userId: string;
    label: string;
    summary: any;
    timestamp: string;
  };
  error?: string;
  details?: string;
}

const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
): Promise<{ statusCode: number; body: string }> => {
  try {
    // Verify cron secret
    const authHeader = event.headers.authorization;
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      console.error('Invalid cron authorization');
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized' }),
      };
    }

    // Configuration
    const userId = '2d30743e-10cb-4490-933c-4ccdf37364e9';
    const label = 'Label_969329089524850868';

    console.log('Starting Gmail sync (Netlify function):', {
      userId,
      label,
      timestamp: new Date().toISOString(),
      eventType: event.httpMethod,
      isScheduled: event.httpMethod === 'POST',
    });

    // Step 1: Try history sync first
    const historyResult = await syncByHistory({ userId, label });

    if (historyResult.usedFallback) {
      console.log('History sync not available, falling back to label scan');

      // Step 2: Fall back to label scanning
      const labelResult = await syncByLabel({
        userId,
        label,
        maxFetch: 25, // Process 25 messages on fallback
      });

      // If this is the first run, create sync state with current history ID
      if (labelResult.scanned > 0) {
        try {
          // Get the latest history ID from Gmail API
          const { getGmail } = await import('../../app/lib/google/gmailClient');
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

      const response: SyncResponse = {
        success: true,
        message: 'Gmail sync completed (label scan fallback)',
        data: {
          method: 'label_scan',
          userId,
          label,
          summary: labelResult,
          timestamp: new Date().toISOString(),
        },
      };

      return {
        statusCode: 200,
        body: JSON.stringify(response),
      };
    }

    // History sync was successful
    const response: SyncResponse = {
      success: true,
      message: 'Gmail sync completed (history API)',
      data: {
        method: 'history_api',
        userId,
        label,
        summary: historyResult,
        timestamp: new Date().toISOString(),
      },
    };

    return {
      statusCode: 200,
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('Gmail sync function error:', error);

    const errorResponse: SyncResponse = {
      success: false,
      message: 'Failed to sync Gmail messages',
      data: {
        method: 'label_scan',
        userId: 'unknown',
        label: 'unknown',
        summary: { error: 'Sync failed' },
        timestamp: new Date().toISOString(),
      },
      error: 'Failed to sync Gmail messages',
      details: error instanceof Error ? error.message : 'Unknown error',
    };

    return {
      statusCode: 500,
      body: JSON.stringify(errorResponse),
    };
  }
};

export { handler };

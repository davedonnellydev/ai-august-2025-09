import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { syncByHistory } from '../../app/lib/email/historySync';
import { syncByLabel } from '../../app/lib/email/syncByLabel';
import { upsertSyncState } from '../../app/lib/email/syncState';
import { db, userSettingsTable, syncStateTable } from '../../app/db';
import { eq, and, lt, or, isNull } from 'drizzle-orm';

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

interface ScheduledSyncResult {
  success: boolean;
  message: string;
  data: {
    totalUsers: number;
    usersProcessed: number;
    usersSkipped: number;
    totalEmailsProcessed: number;
    totalLeadsInserted: number;
    totalErrors: number;
    results: Array<{
      userId: string;
      labels: string[];
      method: 'history_api' | 'label_scan' | 'skipped' | 'error';
      summary?: any;
      error?: string;
    }>;
    timestamp: string;
  };
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

    console.log('Starting scheduled Gmail sync (Netlify function):', {
      timestamp: new Date().toISOString(),
      eventType: event.httpMethod,
      isScheduled: event.httpMethod === 'POST',
    });

    // Get all users with user settings
    const allUsers = await db
      .select({
        userId: userSettingsTable.userId,
        watchedLabelIds: userSettingsTable.watchedLabelIds,
        cronFrequencyMinutes: userSettingsTable.cronFrequencyMinutes,
      })
      .from(userSettingsTable);

    // Filter users with watched labels (non-empty arrays)
    const usersWithSettings = allUsers.filter(
      (user) => user.watchedLabelIds && user.watchedLabelIds.length > 0
    );

    if (usersWithSettings.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: 'No users with watched labels found',
          data: {
            totalUsers: 0,
            usersProcessed: 0,
            usersSkipped: 0,
            totalEmailsProcessed: 0,
            totalLeadsInserted: 0,
            totalErrors: 0,
            results: [],
            timestamp: new Date().toISOString(),
          },
        }),
      };
    }

    const results = [];
    let usersProcessed = 0;
    let usersSkipped = 0;
    let totalEmailsProcessed = 0;
    let totalLeadsInserted = 0;
    let totalErrors = 0;

    // Process each user
    for (const user of usersWithSettings) {
      try {
        // Check if user should be skipped based on cron frequency
        const [syncState] = await db
          .select()
          .from(syncStateTable)
          .where(eq(syncStateTable.userId, user.userId))
          .limit(1);

        const shouldSkip =
          syncState?.finishedAt &&
          (() => {
            const lastSync = new Date(syncState.finishedAt);
            const now = new Date();
            const minutesSinceLastSync = Math.floor(
              (now.getTime() - lastSync.getTime()) / (1000 * 60)
            );
            return minutesSinceLastSync < user.cronFrequencyMinutes;
          })();

        if (shouldSkip) {
          console.log(
            `Skipping user ${user.userId} - within cron frequency (${user.cronFrequencyMinutes} minutes)`
          );
          usersSkipped++;
          results.push({
            userId: user.userId,
            labels: user.watchedLabelIds,
            method: 'skipped' as const,
          });
          continue;
        }

        console.log(
          `Processing user ${user.userId} with ${user.watchedLabelIds.length} watched labels`
        );

        let userEmailsProcessed = 0;
        let userLeadsInserted = 0;
        let userErrors = 0;

        // Process each watched label for the user
        for (const labelId of user.watchedLabelIds) {
          try {
            console.log(`Processing label ${labelId} for user ${user.userId}`);

            // Step 1: Try history sync first
            const historyResult = await syncByHistory({
              userId: user.userId,
              label: labelId,
            });

            if (historyResult.usedFallback) {
              console.log(
                `History sync not available for label ${labelId}, falling back to label scan`
              );

              // Step 2: Fall back to label scanning
              const labelResult = await syncByLabel({
                userId: user.userId,
                label: labelId,
                maxFetch: 25, // Process 25 messages on fallback
              });

              userEmailsProcessed += labelResult.scanned;
              userLeadsInserted += labelResult.leadsInserted;
              userErrors += labelResult.errors.length;
            } else {
              // History sync was successful
              userEmailsProcessed += historyResult.processed;
              userLeadsInserted += historyResult.leadsInserted;
              userErrors += historyResult.errors.length;
            }
          } catch (error) {
            console.error(
              `Error processing label ${labelId} for user ${user.userId}:`,
              error
            );
            userErrors++;
          }
        }

        // Update sync state to mark completion
        await upsertSyncState(user.userId, {
          mode: 'cron',
          watchedLabelIds: user.watchedLabelIds,
          finishedAt: new Date(),
          scanned: userEmailsProcessed,
          newEmails: userEmailsProcessed,
          jobsCreated: userLeadsInserted,
          jobsUpdated: 0,
          errors: userErrors,
        });

        totalEmailsProcessed += userEmailsProcessed;
        totalLeadsInserted += userLeadsInserted;
        totalErrors += userErrors;
        usersProcessed++;

        results.push({
          userId: user.userId,
          labels: user.watchedLabelIds,
          method: 'history_api' as const,
          summary: {
            emailsProcessed: userEmailsProcessed,
            leadsInserted: userLeadsInserted,
            errors: userErrors,
          },
        });
      } catch (error) {
        console.error(`Error processing user ${user.userId}:`, error);
        totalErrors++;
        results.push({
          userId: user.userId,
          labels: user.watchedLabelIds,
          method: 'error' as const,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const response: ScheduledSyncResult = {
      success: true,
      message: 'Scheduled Gmail sync completed',
      data: {
        totalUsers: usersWithSettings.length,
        usersProcessed,
        usersSkipped,
        totalEmailsProcessed,
        totalLeadsInserted,
        totalErrors,
        results,
        timestamp: new Date().toISOString(),
      },
    };

    console.log('Scheduled sync completed:', response);

    return {
      statusCode: 200,
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('Scheduled Gmail sync function error:', error);

    const errorResponse: ScheduledSyncResult = {
      success: false,
      message: 'Failed to sync Gmail messages',
      data: {
        totalUsers: 0,
        usersProcessed: 0,
        usersSkipped: 0,
        totalEmailsProcessed: 0,
        totalLeadsInserted: 0,
        totalErrors: 1,
        results: [],
        timestamp: new Date().toISOString(),
      },
    };

    return {
      statusCode: 500,
      body: JSON.stringify(errorResponse),
    };
  }
};

export { handler };

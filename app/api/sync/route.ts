import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../auth';
import { db, userSettingsTable } from '../../db';
import { eq } from 'drizzle-orm';
import { syncByHistory } from '../../lib/email/historySync';
import { syncByLabel } from '../../lib/email/syncByLabel';
import { upsertSyncState } from '../../lib/email/syncState';

export async function POST(_request: NextRequest) {
  try {
    // Get current user session
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Get user's watched labels
    const [userSettings] = await db
      .select()
      .from(userSettingsTable)
      .where(eq(userSettingsTable.userId, userId))
      .limit(1);

    if (!userSettings || !userSettings.watchedLabelIds.length) {
      return NextResponse.json(
        {
          success: false,
          error:
            'No watched labels configured. Please configure labels in Settings first.',
        },
        { status: 400 }
      );
    }

    // Log sync start for debugging
    const results = [];
    let totalEmailsProcessed = 0;
    let totalLeadsInserted = 0;
    let totalDedupedByUrl = 0;
    let totalDuplicatesFlagged = 0;
    let totalErrors = 0;

    // Process each watched label
    for (const labelId of userSettings.watchedLabelIds) {
      try {
        // Log label processing for debugging

        // Step 1: Try history sync first
        const historyResult = await syncByHistory({ userId, label: labelId });

        if (historyResult.usedFallback) {
          // Log fallback for debugging

          // Step 2: Fall back to label scanning
          const labelResult = await syncByLabel({
            userId,
            label: labelId,
            maxFetch: 20, // Process more messages on fallback
          });

          results.push({
            labelId,
            method: 'label_scan',
            summary: labelResult,
          });

          totalEmailsProcessed += labelResult.scanned;
          totalLeadsInserted += labelResult.leadsInserted;
          totalDedupedByUrl += labelResult.dedupedByUrl;
          totalDuplicatesFlagged += labelResult.duplicatesFlagged;
          totalErrors += labelResult.errors.length;
        } else {
          // History sync was successful
          results.push({
            labelId,
            method: 'history_api',
            summary: historyResult,
          });

          totalEmailsProcessed += historyResult.processed;
          totalLeadsInserted += historyResult.leadsInserted;
          totalDedupedByUrl += historyResult.dedupedByUrl;
          totalDuplicatesFlagged += historyResult.duplicatesFlagged;
          totalErrors += historyResult.errors.length;
        }
      } catch (error) {
        // Log error for debugging
        totalErrors++;
        results.push({
          labelId,
          method: 'error',
          summary: {
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      }
    }

    // Update sync state to mark completion
    await upsertSyncState(userId, {
      mode: 'manual',
      watchedLabelIds: userSettings.watchedLabelIds,
      finishedAt: new Date(),
      scanned: totalEmailsProcessed,
      newEmails: totalEmailsProcessed,
      jobsCreated: totalLeadsInserted,
      jobsUpdated: 0,
      errors: totalErrors,
    });

    const summary = {
      success: true,
      message: 'Manual Gmail sync completed',
      data: {
        userId,
        totalLabels: userSettings.watchedLabelIds.length,
        totalEmailsProcessed,
        totalLeadsInserted,
        totalDedupedByUrl,
        totalDuplicatesFlagged,
        totalErrors,
        results,
        timestamp: new Date().toISOString(),
      },
    };

    // Log sync completion for debugging

    return NextResponse.json(summary);
  } catch (error) {
    // Log error for debugging but don't expose in response

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

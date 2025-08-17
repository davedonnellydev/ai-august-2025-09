import { db, syncStateTable } from '../../db';
import { eq } from 'drizzle-orm';

export interface SyncState {
  lastHistoryId?: string;
  startedAt: Date;
  finishedAt?: Date;
}

export interface SyncStateUpdate {
  lastHistoryId?: string;
  startedAt?: Date;
  finishedAt?: Date;
  mode?: string;
  watchedLabelIds?: string[];
  scanned?: number;
  newEmails?: number;
  jobsCreated?: number;
  jobsUpdated?: number;
  errors?: number;
}

/**
 * Get sync state for a user
 * @param userId - User identifier
 * @returns Sync state or null if not found
 */
export async function getSyncState(userId: string): Promise<SyncState | null> {
  try {
    const [syncState] = await db
      .select({
        lastHistoryId: syncStateTable.lastHistoryId,
        startedAt: syncStateTable.startedAt,
        finishedAt: syncStateTable.finishedAt,
      })
      .from(syncStateTable)
      .where(eq(syncStateTable.userId, userId))
      .limit(1);

    if (!syncState) {
      return null;
    }

    return {
      lastHistoryId: syncState.lastHistoryId || undefined,
      startedAt: syncState.startedAt,
      finishedAt: syncState.finishedAt || undefined,
    };
  } catch (error) {
    console.error('Error getting sync state:', error);
    throw new Error(`Failed to get sync state for user ${userId}: ${error}`);
  }
}

/**
 * Upsert sync state for a user (idempotent)
 * @param userId - User identifier
 * @param patch - Fields to update
 * @returns Updated sync state
 */
export async function upsertSyncState(
  userId: string,
  patch: SyncStateUpdate
): Promise<SyncState> {
  try {
    const updateData: any = {};

    if (patch.lastHistoryId !== undefined) {
      updateData.lastHistoryId = patch.lastHistoryId;
    }

    if (patch.startedAt !== undefined) {
      updateData.startedAt = patch.startedAt;
    }

    if (patch.finishedAt !== undefined) {
      updateData.finishedAt = patch.finishedAt;
    }

    if (patch.mode !== undefined) {
      updateData.mode = patch.mode;
    }

    if (patch.watchedLabelIds !== undefined) {
      updateData.watchedLabelIds = patch.watchedLabelIds;
    }

    if (patch.scanned !== undefined) {
      updateData.scanned = patch.scanned;
    }

    if (patch.newEmails !== undefined) {
      updateData.newEmails = patch.newEmails;
    }

    if (patch.jobsCreated !== undefined) {
      updateData.jobsCreated = patch.jobsCreated;
    }

    if (patch.jobsUpdated !== undefined) {
      updateData.jobsUpdated = patch.jobsUpdated;
    }

    if (patch.errors !== undefined) {
      updateData.errors = patch.errors;
    }

    // Note: syncStateTable doesn't have updatedAt column

    const [upsertedSyncState] = await db
      .insert(syncStateTable)
      .values({
        userId,
        mode: patch.mode || 'manual',
        watchedLabelIds: patch.watchedLabelIds || [],
        lastHistoryId: patch.lastHistoryId || null,
        startedAt: patch.startedAt || new Date(),
        finishedAt: patch.finishedAt || null,
        scanned: patch.scanned || 0,
        newEmails: patch.newEmails || 0,
        jobsCreated: patch.jobsCreated || 0,
        jobsUpdated: patch.jobsUpdated || 0,
        errors: patch.errors || 0,
      })
      .onConflictDoUpdate({
        target: syncStateTable.userId,
        set: updateData,
      })
      .returning();

    return {
      lastHistoryId: upsertedSyncState.lastHistoryId || undefined,
      startedAt: upsertedSyncState.startedAt,
      finishedAt: upsertedSyncState.finishedAt || undefined,
    };
  } catch (error) {
    console.error('Error upserting sync state:', error);
    throw new Error(`Failed to upsert sync state for user ${userId}: ${error}`);
  }
}

/**
 * Create or reset sync state for a user
 * @param userId - User identifier
 * @param lastHistoryId - Optional last history ID
 * @returns Created sync state
 */
export async function createSyncState(
  userId: string,
  lastHistoryId?: string
): Promise<SyncState> {
  try {
    const [syncState] = await db
      .insert(syncStateTable)
      .values({
        userId,
        mode: 'manual',
        watchedLabelIds: [],
        lastHistoryId: lastHistoryId || null,
        startedAt: new Date(),
        finishedAt: null,
      })
      .onConflictDoUpdate({
        target: syncStateTable.userId,
        set: {
          lastHistoryId: lastHistoryId || null,
          startedAt: new Date(),
          finishedAt: null,
          // Note: syncStateTable doesn't have updatedAt column
        },
      })
      .returning();

    return {
      lastHistoryId: syncState.lastHistoryId || undefined,
      startedAt: syncState.startedAt,
      finishedAt: syncState.finishedAt || undefined,
    };
  } catch (error) {
    console.error('Error creating sync state:', error);
    throw new Error(`Failed to create sync state for user ${userId}: ${error}`);
  }
}

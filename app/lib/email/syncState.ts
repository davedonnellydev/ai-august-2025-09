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

    // Note: syncStateTable doesn't have updatedAt column

    const [upsertedSyncState] = await db
      .insert(syncStateTable)
      .values({
        userId,
        mode: 'manual', // Default mode, can be overridden
        watchedLabelIds: [], // Default empty array
        lastHistoryId: patch.lastHistoryId || null,
        startedAt: patch.startedAt || new Date(),
        finishedAt: patch.finishedAt || null,
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

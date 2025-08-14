import { db, gmailSyncStateTable } from '../../db';
import { eq } from 'drizzle-orm';

export interface SyncState {
  lastHistoryId: string;
  lastSyncedAt: Date;
}

export interface SyncStateUpdate {
  lastHistoryId?: string;
  lastSyncedAt?: Date;
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
        lastHistoryId: gmailSyncStateTable.lastHistoryId,
        lastSyncedAt: gmailSyncStateTable.lastSyncedAt,
      })
      .from(gmailSyncStateTable)
      .where(eq(gmailSyncStateTable.userId, userId))
      .limit(1);

    if (!syncState) {
      return null;
    }

    return {
      lastHistoryId: syncState.lastHistoryId || '',
      lastSyncedAt: syncState.lastSyncedAt,
    };
  } catch (error) {
    console.error('Error getting sync state:', error);
    throw new Error(`Failed to get sync state for user ${userId}: ${error}`);
  }
}

/**
 * Update sync state for a user
 * @param userId - User identifier
 * @param state - New sync state values
 * @returns Updated sync state
 */
export async function updateSyncState(
  userId: string,
  state: SyncStateUpdate
): Promise<SyncState> {
  try {
    const updateData: any = {};

    if (state.lastHistoryId !== undefined) {
      updateData.lastHistoryId = state.lastHistoryId;
    }

    if (state.lastSyncedAt !== undefined) {
      updateData.lastSyncedAt = state.lastSyncedAt;
    } else {
      updateData.lastSyncedAt = new Date();
    }

    const [updatedSyncState] = await db
      .insert(gmailSyncStateTable)
      .values({
        userId,
        lastHistoryId: state.lastHistoryId || null,
        lastSyncedAt: state.lastSyncedAt || new Date(),
      })
      .onConflictDoUpdate({
        target: gmailSyncStateTable.userId,
        set: updateData,
      })
      .returning();

    return {
      lastHistoryId: updatedSyncState.lastHistoryId || '',
      lastSyncedAt: updatedSyncState.lastSyncedAt,
    };
  } catch (error) {
    console.error('Error updating sync state:', error);
    throw new Error(`Failed to update sync state for user ${userId}: ${error}`);
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
      .insert(gmailSyncStateTable)
      .values({
        userId,
        lastHistoryId: lastHistoryId || null,
        lastSyncedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: gmailSyncStateTable.userId,
        set: {
          lastHistoryId: lastHistoryId || null,
          lastSyncedAt: new Date(),
        },
      })
      .returning();

    return {
      lastHistoryId: syncState.lastHistoryId || '',
      lastSyncedAt: syncState.lastSyncedAt,
    };
  } catch (error) {
    console.error('Error creating sync state:', error);
    throw new Error(`Failed to create sync state for user ${userId}: ${error}`);
  }
}

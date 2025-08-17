/**
 * Test file demonstrating usage of sync state utilities
 * This file shows how to use the getSyncState and upsertSyncState functions
 */

import { getSyncState, upsertSyncState, createSyncState } from './syncState';

// Example usage functions
export async function exampleSyncStateUsage() {
  const userId = 'test-user-123';

  try {
    // Example 1: Get current sync state
    console.log('=== Getting current sync state ===');
    const currentState = await getSyncState(userId);
    
    if (currentState) {
      console.log('Current sync state:', {
        lastHistoryId: currentState.lastHistoryId || 'none',
        startedAt: currentState.startedAt.toISOString(),
        finishedAt: currentState.finishedAt?.toISOString() || 'not finished',
      });
    } else {
      console.log('No sync state found for user');
    }

    // Example 2: Start a new sync operation
    console.log('\n=== Starting new sync operation ===');
    const syncStartState = await upsertSyncState(userId, {
      startedAt: new Date(),
      finishedAt: undefined, // Clear finished time when starting
    });
    
    console.log('Sync started:', {
      startedAt: syncStartState.startedAt.toISOString(),
      finishedAt: syncStartState.finishedAt ? 'should be undefined' : 'undefined (correct)',
    });

    // Example 3: Update with history ID during sync
    console.log('\n=== Updating with history ID ===');
    const historyId = 'history_12345';
    const withHistoryState = await upsertSyncState(userId, {
      lastHistoryId: historyId,
    });
    
    console.log('Updated with history ID:', {
      lastHistoryId: withHistoryState.lastHistoryId,
      startedAt: withHistoryState.startedAt.toISOString(),
    });

    // Example 4: Mark sync as finished
    console.log('\n=== Marking sync as finished ===');
    const finishedState = await upsertSyncState(userId, {
      finishedAt: new Date(),
    });
    
    console.log('Sync finished:', {
      lastHistoryId: finishedState.lastHistoryId,
      startedAt: finishedState.startedAt.toISOString(),
      finishedAt: finishedState.finishedAt?.toISOString(),
    });

    // Example 5: Create initial sync state (if none exists)
    console.log('\n=== Creating initial sync state ===');
    const initialState = await createSyncState(userId, 'initial_history_999');
    
    console.log('Initial state created:', {
      lastHistoryId: initialState.lastHistoryId,
      startedAt: initialState.startedAt.toISOString(),
      finishedAt: initialState.finishedAt || 'null (correct)',
    });

    return {
      success: true,
      finalState: finishedState,
    };

  } catch (error) {
    console.error('Error in sync state example:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Example of checking if a sync is in progress
export async function isSyncInProgress(userId: string): Promise<boolean> {
  try {
    const state = await getSyncState(userId);
    
    if (!state) {
      return false; // No sync state means no sync in progress
    }
    
    // If startedAt exists but finishedAt is null/undefined, sync is in progress
    return state.startedAt && !state.finishedAt;
  } catch (error) {
    console.error('Error checking sync status:', error);
    return false;
  }
}

// Example of getting the last successful sync time
export async function getLastSuccessfulSyncTime(userId: string): Promise<Date | null> {
  try {
    const state = await getSyncState(userId);
    
    if (!state || !state.finishedAt) {
      return null; // No successful sync found
    }
    
    return state.finishedAt;
  } catch (error) {
    console.error('Error getting last sync time:', error);
    return null;
  }
}

// Example of getting sync statistics
export async function getSyncStats(userId: string) {
  try {
    const state = await getSyncState(userId);
    
    if (!state) {
      return {
        hasSyncHistory: false,
        lastSyncTime: null,
        lastHistoryId: null,
        isCurrentlySyncing: false,
      };
    }
    
    const now = new Date();
    const isCurrentlySyncing = state.startedAt && !state.finishedAt;
    const lastSyncTime = state.finishedAt;
    
    return {
      hasSyncHistory: true,
      lastSyncTime,
      lastHistoryId: state.lastHistoryId,
      isCurrentlySyncing,
      timeSinceLastSync: lastSyncTime ? now.getTime() - lastSyncTime.getTime() : null,
    };
  } catch (error) {
    console.error('Error getting sync stats:', error);
    return {
      hasSyncHistory: false,
      lastSyncTime: null,
      lastHistoryId: null,
      isCurrentlySyncing: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

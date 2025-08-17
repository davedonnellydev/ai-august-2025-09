# Email Sync State Utilities

This module provides utilities for managing Gmail sync state using the `sync_state` database table.

## Overview

The sync state tracks:
- **`lastHistoryId`**: The last Gmail History API ID processed (for incremental syncs)
- **`startedAt`**: When the current sync operation started
- **`finishedAt`**: When the last sync operation completed (null = sync in progress)

## Functions

### `getSyncState(userId: string): Promise<SyncState | null>`

Retrieves the current sync state for a user.

```typescript
const state = await getSyncState('user-123');
if (state) {
  console.log('Last sync finished at:', state.finishedAt);
  console.log('Currently syncing:', !state.finishedAt);
}
```

### `upsertSyncState(userId: string, patch: SyncStateUpdate): Promise<SyncState>`

Updates sync state fields idempotently. Only specified fields are updated.

```typescript
// Start a new sync
await upsertSyncState('user-123', {
  startedAt: new Date(),
  finishedAt: undefined, // Clear finished time
});

// Update with history ID during sync
await upsertSyncState('user-123', {
  lastHistoryId: 'history_456',
});

// Mark sync as finished
await upsertSyncState('user-123', {
  finishedAt: new Date(),
});
```

### `createSyncState(userId: string, lastHistoryId?: string): Promise<SyncState>`

Creates initial sync state for a user (idempotent).

```typescript
await createSyncState('user-123', 'initial_history_999');
```

## Usage Examples

### Check if sync is in progress

```typescript
async function isSyncInProgress(userId: string): Promise<boolean> {
  const state = await getSyncState(userId);
  return state ? (state.startedAt && !state.finishedAt) : false;
}
```

### Get last successful sync time

```typescript
async function getLastSyncTime(userId: string): Promise<Date | null> {
  const state = await getSyncState(userId);
  return state?.finishedAt || null;
}
```

### Start a new sync operation

```typescript
async function startSync(userId: string): Promise<void> {
  await upsertSyncState(userId, {
    startedAt: new Date(),
    finishedAt: undefined,
  });
}
```

### Complete a sync operation

```typescript
async function finishSync(userId: string, lastHistoryId: string): Promise<void> {
  await upsertSyncState(userId, {
    finishedAt: new Date(),
    lastHistoryId,
  });
}
```

## Database Schema

The `sync_state` table structure:

```sql
CREATE TABLE sync_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mode VARCHAR(16) NOT NULL DEFAULT 'manual',
  watched_label_ids JSONB NOT NULL DEFAULT '[]',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  finished_at TIMESTAMP WITH TIME ZONE,
  scanned INTEGER DEFAULT 0,
  new_emails INTEGER DEFAULT 0,
  jobs_created INTEGER DEFAULT 0,
  jobs_updated INTEGER DEFAULT 0,
  errors INTEGER DEFAULT 0,
  last_history_id VARCHAR(64)
);
```

## Notes

- **Idempotent operations**: All functions use UPSERT patterns to avoid conflicts
- **No `updatedAt`**: The table doesn't track modification timestamps
- **Default values**: `mode` defaults to 'manual', `watchedLabelIds` defaults to empty array
- **History tracking**: `lastHistoryId` enables incremental syncs using Gmail History API

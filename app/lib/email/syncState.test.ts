import { jest } from '@jest/globals';
import { getSyncState, upsertSyncState, createSyncState } from './syncState';

// Mock the database module
jest.mock('../../db', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    from: jest.fn(),
    where: jest.fn(),
    values: jest.fn(),
    onConflictDoUpdate: jest.fn(),
    returning: jest.fn(),
    eq: jest.fn(),
    and: jest.fn(),
  },
  syncStateTable: {
    userId: 'userId',
    lastHistoryId: 'lastHistoryId',
    startedAt: 'startedAt',
    finishedAt: 'finishedAt',
    mode: 'mode',
    watchedLabelIds: 'watchedLabelIds',
    scanned: 'scanned',
    newEmails: 'newEmails',
    jobsCreated: 'jobsCreated',
    jobsUpdated: 'jobsUpdated',
    errors: 'errors',
  },
}));

// Mock drizzle-orm
jest.mock('drizzle-orm', () => ({
  eq: jest.fn(),
  and: jest.fn(),
}));

describe('syncState', () => {
  const mockUserId = 'test-user-123';
  let mockDb: any;
  let mockSyncStateTable: any;
  let mockEq: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Get mocked modules
    const dbModule = await import('../../db');
    const drizzleModule = await import('drizzle-orm');
    
    mockDb = dbModule.db;
    mockSyncStateTable = dbModule.syncStateTable;
    mockEq = drizzleModule.eq;

    // Setup default mock implementations
    mockDb.select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([]),
        }),
      }),
    });

    mockDb.insert.mockReturnValue({
      values: jest.fn().mockReturnValue({
        onConflictDoUpdate: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([]),
        }),
      }),
    });

    mockDb.update.mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([]),
        }),
      }),
    });

    mockEq.mockReturnValue('eq_value');
  });

  describe('getSyncState', () => {
    it('should return null when no sync state exists', async () => {
      const result = await getSyncState(mockUserId);

      expect(result).toBeNull();
      expect(mockDb.select).toHaveBeenCalledWith({
        lastHistoryId: mockSyncStateTable.lastHistoryId,
        startedAt: mockSyncStateTable.startedAt,
        finishedAt: mockSyncStateTable.finishedAt,
      });
    });

    it('should return sync state when it exists', async () => {
      const mockState = {
        lastHistoryId: 'history_123',
        startedAt: new Date('2024-01-01T00:00:00Z'),
        finishedAt: new Date('2024-01-01T01:00:00Z'),
      };

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockState]),
          }),
        }),
      });

      const result = await getSyncState(mockUserId);

      expect(result).toEqual(mockState);
    });

    it('should handle database errors gracefully', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockRejectedValue(new Error('Database error')),
          }),
        }),
      });

      const result = await getSyncState(mockUserId);

      expect(result).toBeNull();
    });
  });

  describe('upsertSyncState', () => {
    it('should create new sync state when none exists', async () => {
      const mockNewState = {
        lastHistoryId: 'history_123',
        startedAt: new Date('2024-01-01T00:00:00Z'),
        finishedAt: undefined,
      };

      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          onConflictDoUpdate: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([mockNewState]),
          }),
        }),
      });

      const result = await upsertSyncState(mockUserId, mockNewState);

      expect(result).toEqual(mockNewState);
      expect(mockDb.insert).toHaveBeenCalledWith(mockSyncStateTable);
    });

    it('should handle database errors gracefully', async () => {
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          onConflictDoUpdate: jest.fn().mockReturnValue({
            returning: jest.fn().mockRejectedValue(new Error('Database error')),
          }),
        }),
      });

      await expect(
        upsertSyncState(mockUserId, {
          startedAt: new Date(),
        })
      ).rejects.toThrow('Database error');
    });
  });

  describe('createSyncState', () => {
    it('should create initial sync state', async () => {
      const mockNewState = {
        lastHistoryId: 'initial_history',
        startedAt: new Date('2024-01-01T00:00:00Z'),
        finishedAt: undefined,
      };

      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          onConflictDoUpdate: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([mockNewState]),
          }),
        }),
      });

      const result = await createSyncState(mockUserId, 'initial_history');

      expect(result).toEqual(mockNewState);
      expect(mockDb.insert).toHaveBeenCalledWith(mockSyncStateTable);
    });

    it('should handle database errors gracefully', async () => {
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          onConflictDoUpdate: jest.fn().mockReturnValue({
            returning: jest.fn().mockRejectedValue(new Error('Database error')),
          }),
        }),
      });

      await expect(
        createSyncState(mockUserId, 'initial_history')
      ).rejects.toThrow('Database error');
    });
  });
});

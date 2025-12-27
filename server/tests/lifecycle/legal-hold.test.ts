
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const mockQuery = jest.fn<any>();
const mockPool = {
    query: mockQuery,
};

jest.mock('../../src/db/postgres', () => ({
    getPostgresPool: jest.fn(() => mockPool),
}));

jest.mock('../../src/config/logger', () => ({
    child: () => ({
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
    }),
    default: {
         child: () => ({
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn(),
        }),
    }
}));

// Mock Evidence to avoid circular/db calls during this test
jest.mock('../../src/lifecycle/evidence', () => ({
    LifecycleEvidence: {
        getInstance: () => ({
            recordEvent: jest.fn(),
        }),
    },
}));

import { LegalHoldManager } from '../../src/lifecycle/legal-hold';
import { getPostgresPool } from '../../src/db/postgres';

describe('LegalHoldManager', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue({ rowCount: 0, rows: [] });
    (getPostgresPool as jest.Mock).mockReturnValue(mockPool);
  });

  it('should return false if no hold exists', async () => {
    const manager = LegalHoldManager.getInstance();
    const isHold = await manager.isUnderHold('tenant-123');
    expect(isHold).toBe(false);
  });

  it('should return true if hold exists', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{}] });
    const manager = LegalHoldManager.getInstance();
    const isHold = await manager.isUnderHold('tenant-123');
    expect(isHold).toBe(true);
  });

  it('should create a hold table and insert record', async () => {
     const manager = LegalHoldManager.getInstance();
     await manager.createHold('tenant-123', 'Investigation', 'admin');
     expect(mockQuery).toHaveBeenCalledTimes(2); // Create table + Insert
  });
});

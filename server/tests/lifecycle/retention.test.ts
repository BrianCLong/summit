
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

// Mock LegalHoldManager and Evidence
jest.mock('../../src/lifecycle/legal-hold', () => ({
    LegalHoldManager: {
        getInstance: () => ({
            isUnderHold: jest.fn<any>().mockResolvedValue(false),
        }),
    },
}));

jest.mock('../../src/lifecycle/evidence', () => ({
    LifecycleEvidence: {
        getInstance: () => ({
            recordEvent: jest.fn(),
        }),
    },
}));

import { RetentionManager } from '../../src/lifecycle/retention-manager';
import { getPostgresPool } from '../../src/db/postgres';

describe('RetentionManager', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue({ rowCount: 5, rows: [] });
    (getPostgresPool as jest.Mock).mockReturnValue(mockPool);
  });

  it('should scan and attempt to delete expired records', async () => {
    const manager = RetentionManager.getInstance();
    const results = await manager.scanExpired();

    // Verify it called query
    expect(mockQuery).toHaveBeenCalled();

    // Check results structure
    expect(results.OPERATIONAL_METADATA).toBeGreaterThanOrEqual(0);
  });
});

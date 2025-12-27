
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { DeletionService } from '../../src/lifecycle/deletion-service';
import { getPostgresPool } from '../../src/db/postgres';
import { LegalHoldManager } from '../../src/lifecycle/legal-hold';

// Mock the modules
jest.mock('../../src/db/postgres');
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
jest.mock('../../src/lifecycle/legal-hold');
jest.mock('../../src/lifecycle/evidence', () => ({
    LifecycleEvidence: {
        getInstance: () => ({
            recordEvent: jest.fn(),
        }),
    },
}));

describe('DeletionService', () => {
  let mockQuery: any;
  let mockPool: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockQuery = jest.fn<any>().mockResolvedValue({ rowCount: 1 });
    mockPool = {
      query: mockQuery,
      // Implement withTransaction to immediately execute the callback with a mock client
      withTransaction: jest.fn(async (cb: any) => {
        return await cb({ query: mockQuery });
      }),
    };

    (getPostgresPool as jest.Mock).mockReturnValue(mockPool);

    // Setup LegalHold mock
    (LegalHoldManager.getInstance as jest.Mock) = jest.fn(() => ({
        isUnderHold: jest.fn<any>().mockResolvedValue(false),
        createHold: jest.fn(),
        releaseHold: jest.fn(),
    })) as any;
  });

  it('should hard delete tenant data', async () => {
    const service = DeletionService.getInstance();
    await service.hardDeleteTenant('tenant-123');

    expect(mockPool.withTransaction).toHaveBeenCalled();
    // Logic inside transaction:
    // 1. Check hold (mocked false)
    // 2. Loop tables and delete
    expect(mockQuery).toHaveBeenCalled();
    expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM'),
        expect.anything()
    );
  });
});

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { UsageKind } from '../../types/usage.js';

// Track calls for assertions
let queryCallCount = 0;
let releaseCallCount = 0;

// Mock modules before imports
jest.mock('../../config/database.js', () => ({
  getPostgresPool: () => ({
    connect: () => Promise.resolve({
      query: () => {
        queryCallCount++;
        return Promise.resolve({ rowCount: 1 });
      },
      release: () => {
        releaseCallCount++;
      },
    }),
  }),
}));

jest.mock('../../utils/logger.js', () => ({
  default: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
  error: jest.fn(),
}));

jest.mock('../../utils/metrics.js', () => ({
  PrometheusMetrics: class {
    createCounter(): void {}
    incrementCounter(): void {}
  }
}));

// Import after mocks
import { UsageMeteringService } from '../UsageMeteringService.js';

describe('UsageMeteringService', () => {
  let service: UsageMeteringService;

  beforeEach(() => {
    // Reset call counts
    queryCallCount = 0;
    releaseCallCount = 0;

    // Reset singleton
    (UsageMeteringService as any).instance = null;

    // Get fresh instance
    service = UsageMeteringService.getInstance();
  });

  it('should record a usage event', async () => {
    await service.record({
      tenantId: 't1',
      kind: 'custom' as UsageKind,
      quantity: 10,
      unit: 'calls'
    });

    expect(queryCallCount).toBeGreaterThan(0);
    expect(releaseCallCount).toBeGreaterThan(0);
  });

  it('should record a batch of events', async () => {
    await service.recordBatch([
      { tenantId: 't1', kind: 'custom' as UsageKind, quantity: 1, unit: 'u' },
      { tenantId: 't1', kind: 'custom' as UsageKind, quantity: 2, unit: 'u' }
    ]);

    // BEGIN + 2 inserts + COMMIT = 4 calls
    expect(queryCallCount).toBe(4);
    expect(releaseCallCount).toBeGreaterThan(0);
  });
});

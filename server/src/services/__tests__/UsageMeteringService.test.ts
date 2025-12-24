import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { UsageKind } from '../../types/usage.js';

// 1. Create dependencies
const mockQuery = jest.fn<(...args: any[]) => Promise<any>>();
// IMPORTANT: mockConnect MUST return an object that mocks the client.
// The client has methods like query() and release().
const mockRelease = jest.fn<() => Promise<void>>();
const mockClient = {
  query: mockQuery,
  release: mockRelease,
} as any;
const mockConnect = jest.fn<() => Promise<any>>(() => Promise.resolve(mockClient));

// 2. Mock modules
jest.mock('../../config/database.js', () => ({
  getPostgresPool: () => ({
      connect: mockConnect
  }),
}));

jest.mock('../../utils/logger.js', () => ({
  error: jest.fn(),
}));

jest.mock('../../utils/metrics.js', () => ({
  PrometheusMetrics: class {
    createCounter(): void {}
    incrementCounter(): void {}
  }
}));

// 3. Import Subject
// We need to import after mocks are established, but ESM imports are hoisted.
// However, since we mock entire modules with `jest.mock`, the hoisting is handled by Jest.
// But the issue might be that UsageMeteringService calls getPostgresPool inside constructor or similar.
// Let's rely on Jest hoisting.
import { UsageMeteringService } from '../UsageMeteringService.js';

describe('UsageMeteringService', () => {
  let service: UsageMeteringService;

  beforeEach(() => {
    jest.clearAllMocks();
    (UsageMeteringService as any).instance = null;
    service = UsageMeteringService.getInstance();
  });

  it('should record a usage event', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });

    await service.record({
      tenantId: 't1',
      kind: 'custom' as UsageKind,
      quantity: 10,
      unit: 'calls'
    });

    expect(mockConnect).toHaveBeenCalled();
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO usage_events'),
      expect.arrayContaining(['t1', 'custom', 10, 'calls'])
    );
    expect(mockRelease).toHaveBeenCalled();
  });

  it('should record a batch of events', async () => {
    mockQuery.mockResolvedValue({ rowCount: 1 });

    await service.recordBatch([
      { tenantId: 't1', kind: 'custom' as UsageKind, quantity: 1, unit: 'u' },
      { tenantId: 't1', kind: 'custom' as UsageKind, quantity: 2, unit: 'u' }
    ]);

    expect(mockConnect).toHaveBeenCalled();
    expect(mockQuery).toHaveBeenCalledWith('BEGIN');
    expect(mockQuery).toHaveBeenCalledWith('COMMIT');
    expect(mockQuery).toHaveBeenCalledTimes(4); // BEGIN + 2 inserts + COMMIT
    expect(mockRelease).toHaveBeenCalled();
  });
});

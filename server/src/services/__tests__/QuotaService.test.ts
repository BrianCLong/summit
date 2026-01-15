import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { UsageKind } from '../../types/usage.js';
import PricingEngine from '../PricingEngine.js';
type QueryResult<T = unknown> = { rows: T[] };
type PoolClient = {
  query: (...args: unknown[]) => Promise<QueryResult<any>>;
  release: () => Promise<void>;
};

// 1. Create dependencies
const mockQuery = jest.fn() as jest.MockedFunction<
  (...args: any[]) => Promise<QueryResult<any>>
>;
const mockRelease = jest.fn() as jest.MockedFunction<() => Promise<void>>;
const mockClient: PoolClient = {
  query: mockQuery,
  release: mockRelease,
} as unknown as PoolClient;
const mockConnect = jest.fn(
  () => Promise.resolve(mockClient),
) as jest.MockedFunction<() => Promise<PoolClient>>;

// 2. Mock modules
jest.mock('../../config/database.js', () => ({
  getPostgresPool: () => ({
      connect: mockConnect
  }),
}));

jest.mock('../../utils/logger.js', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
}));

jest.mock('../../utils/metrics.js', () => ({
  PrometheusMetrics: class {
    createCounter(): void {}
    incrementCounter(): void {}
  }
}));

// 3. Import Subject
import { QuotaService } from '../QuotaService.js';

describe('QuotaService', () => {
  let service: QuotaService;
  let getEffectivePlanSpy: jest.SpiedFunction<typeof PricingEngine.getEffectivePlan>;
  const basePlan = {
    id: 'plan-1',
    name: 'Test',
    currency: 'USD',
    features: {},
    limits: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (QuotaService as any).instance = null;
    mockConnect.mockResolvedValue(mockClient);
    mockRelease.mockResolvedValue(undefined);
    mockQuery.mockResolvedValue({ rows: [{ total: '0' }] } as any);
    getEffectivePlanSpy = jest.spyOn(PricingEngine, 'getEffectivePlan');
    service = QuotaService.getInstance();
  });

  it('should allow if no limit is defined', async () => {
    getEffectivePlanSpy.mockResolvedValue({
      plan: basePlan,
      overrides: null
    });

    const result = await service.checkQuota({
      tenantId: 't1',
      kind: 'custom' as UsageKind,
      quantity: 1
    });

    expect(result.allowed).toBe(true);
  });

  it('should deny if hard cap exceeded', async () => {
    getEffectivePlanSpy.mockResolvedValue({
      plan: {
        ...basePlan,
        limits: {
          'custom': { hardCap: 100 }
        },
      },
      overrides: null
    });

    // Mock DB returning current usage of 95.
    // The query returns { rows: [{ total: '95' }] }
    mockQuery.mockResolvedValueOnce({ rows: [{ total: '95' }] });

    // Requesting 10 more (95 + 10 = 105 > 100)
    const result = await service.checkQuota({
      tenantId: 't1',
      kind: 'custom' as UsageKind,
      quantity: 10
    });

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('should trigger soft threshold warning', async () => {
    getEffectivePlanSpy.mockResolvedValue({
      plan: {
        ...basePlan,
        limits: {
          'custom': { hardCap: 100, softThresholds: [80] }
        },
      },
      overrides: null
    });

    // Mock DB returning current usage of 75
    mockQuery.mockResolvedValueOnce({ rows: [{ total: '75' }] });

    // Requesting 10 more (75 + 10 = 85 > 80)
    const result = await service.checkQuota({
      tenantId: 't1',
      kind: 'custom' as UsageKind,
      quantity: 10
    });

    expect(result.allowed).toBe(true);
    expect(result.softThresholdTriggered).toBe(80);
  });
});

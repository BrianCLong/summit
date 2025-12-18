import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { UsageKind } from '../../types/usage';

// 1. Create dependencies
const mockQuery = jest.fn();
const mockRelease = jest.fn();
const mockClient = {
  query: mockQuery,
  release: mockRelease,
};
const mockConnect = jest.fn(() => Promise.resolve(mockClient));

// 2. Mock modules
jest.mock('../../config/database', () => ({
  getPostgresPool: () => ({
      connect: mockConnect
  }),
}));

jest.mock('../../utils/logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
}));

jest.mock('../../utils/metrics', () => ({
  PrometheusMetrics: class {
    createCounter() {}
    incrementCounter() {}
  }
}));

const mockGetEffectivePlan = jest.fn();

jest.mock('../PricingEngine', () => {
    return {
        default: {
            getEffectivePlan: (...args: any[]) => mockGetEffectivePlan(...args)
        }
    };
});

// 3. Import Subject
import { QuotaService } from '../QuotaService';

describe('QuotaService', () => {
  let service: QuotaService;

  beforeEach(() => {
    jest.clearAllMocks();
    (QuotaService as any).instance = null;
    service = QuotaService.getInstance();
  });

  it('should allow if no limit is defined', async () => {
    mockGetEffectivePlan.mockResolvedValue({
      plan: { limits: {} },
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
    mockGetEffectivePlan.mockResolvedValue({
      plan: {
        limits: {
          'custom': { hardCap: 100 }
        }
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
    mockGetEffectivePlan.mockResolvedValue({
      plan: {
        limits: {
          'custom': { hardCap: 100, softThresholds: [80] }
        }
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

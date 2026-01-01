import { jest } from '@jest/globals';
import { PostgresQuotaService } from '../quota';
import { getPostgresPool } from '../../db/postgres.js';
import { planService, Plan } from '../plans';

jest.mock('../../db/postgres.js', () => ({
  getPostgresPool: jest.fn(),
}));

describe('PostgresQuotaService', () => {
  let quotaService: PostgresQuotaService;
  let mockQuery: jest.MockedFunction<any>;
  let mockConnect: jest.MockedFunction<() => Promise<any>>;

  const testPlan: Plan = {
    id: 'plan_test',
    name: 'Test Plan',
    limits: {
      maxUsers: 10,
      maxStorageBytes: 5_000,
      monthlyRequests: 10,
      monthlyComputeMs: 1_000,
      monthlyLlmTokens: 2_000,
    },
    features: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery = jest.fn();
    mockConnect = jest.fn() as jest.MockedFunction<() => Promise<any>>;
    mockConnect.mockResolvedValue({
      query: mockQuery,
      release: jest.fn(),
    });

    (getPostgresPool as jest.Mock).mockReturnValue({
      connect: mockConnect,
    });

    quotaService = new PostgresQuotaService();
    jest.spyOn(planService, 'getPlanForTenant').mockResolvedValue(testPlan);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('allows usage within quota limits', async () => {
    mockQuery.mockResolvedValue({ rows: [{ total: 4 }] });

    const decision = await quotaService.check({
      tenantId: 'tenant-1',
      dimension: 'api.requests',
      quantity: 3,
    });

    expect(decision.allowed).toBe(true);
    expect(decision.remaining).toBe(3);
    expect(decision.limit).toBe(testPlan.limits.monthlyRequests);
  });

  it('denies usage that would exceed limits', async () => {
    mockQuery.mockResolvedValue({ rows: [{ total: 8 }] });

    const decision = await quotaService.check({
      tenantId: 'tenant-1',
      dimension: 'api.requests',
      quantity: 5,
    });

    expect(decision.allowed).toBe(false);
    expect(decision.remaining).toBe(0);
    expect(decision.reason).toContain('Quota exceeded for api.requests');
  });

  it('treats unmapped dimensions as unlimited', async () => {
    const decision = await quotaService.check({
      tenantId: 'tenant-1',
      dimension: 'graph.queries',
      quantity: 5,
    });

    expect(decision.allowed).toBe(true);
    expect(decision.limit).toBe(Infinity);
    expect(mockConnect).not.toHaveBeenCalled();
  });
});

import { UsageDimension } from '../events';
import {
  InMemoryQuotaDataSource,
  PostgresQuotaService,
  QuotaCheck,
  TenantQuotaConfig,
  TenantUsageTotals,
} from '../quota';

describe('PostgresQuotaService', () => {
  const tenantId = 'tenant-123';

  const buildService = (quota: TenantQuotaConfig, usage: TenantUsageTotals) => {
    const dataSource = new InMemoryQuotaDataSource({ [tenantId]: quota }, { [tenantId]: usage });
    return new PostgresQuotaService(dataSource);
  };

  const check = (
    service: PostgresQuotaService,
    dimension: UsageDimension,
    quantity: number,
  ): Promise<Awaited<ReturnType<PostgresQuotaService['check']>>> =>
    service.check({ tenantId, dimension, quantity });

  it('allows usage when within limits', async () => {
    const service = buildService(
      { 'api.requests': { limit: 100, hardLimit: true } },
      { 'api.requests': 25 },
    );

    const decision = await check(service, 'api.requests', 10);

    expect(decision.allowed).toBe(true);
    expect(decision.remaining).toBe(65);
    expect(decision.limit).toBe(100);
    expect(decision.reason).toBeUndefined();
    expect(decision.hardLimit).toBe(true);
  });

  it('denies when exceeding a soft limit and annotates the reason', async () => {
    const service = buildService(
      { 'llm.tokens': { limit: 5_000, hardLimit: false } },
      { 'llm.tokens': 4_800 },
    );

    const quotaCheck: QuotaCheck = { tenantId, dimension: 'llm.tokens', quantity: 500 };
    const decision = await service.check(quotaCheck);

    expect(decision.allowed).toBe(false);
    expect(decision.hardLimit).toBe(false);
    expect(decision.remaining).toBe(0);
    expect(decision.reason).toContain('Soft quota exceeded');

    await expect(service.assert(quotaCheck)).rejects.toThrow('SOFT_QUOTA_EXCEEDED');
  });

  it('denies when exceeding a hard limit and throws a detailed error', async () => {
    const service = buildService({ 'maestro.runs': { limit: 3, hardLimit: true } }, { 'maestro.runs': 3 });

    const quotaCheck: QuotaCheck = { tenantId, dimension: 'maestro.runs', quantity: 1 };
    const decision = await service.check(quotaCheck);

    expect(decision.allowed).toBe(false);
    expect(decision.hardLimit).toBe(true);
    expect(decision.reason).toContain('Hard quota exceeded');

    await expect(service.assert(quotaCheck)).rejects.toThrow('HARD_QUOTA_EXCEEDED');
  });
});

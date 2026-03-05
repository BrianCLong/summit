import { describe, it, expect, beforeEach } from '@jest/globals';
import { QuotaExceededException, QuotaService } from '../QuotaService.js';

describe('QuotaService', () => {
  let service: QuotaService;

  beforeEach(() => {
    service = new QuotaService();
  });

  it('allows usage when within quota', async () => {
    await service.assert({
      tenantId: 't1',
      dimension: 'custom.dimension',
      quantity: 1,
    });

    const quota = await service.getQuota('t1', 'custom.dimension');
    expect(quota).not.toBeNull();
    expect(quota?.used).toBe(1);
    expect(quota?.limit).toBe(1000);
  });

  it('throws QuotaExceededException when hard cap is exceeded', async () => {
    await service.setQuota('t1', 'api.calls', 5, 'daily');
    await service.assert({ tenantId: 't1', dimension: 'api.calls', quantity: 5 });

    await expect(
      service.assert({ tenantId: 't1', dimension: 'api.calls', quantity: 1 }),
    ).rejects.toBeInstanceOf(QuotaExceededException);
  });

  it('resets used quota via resetQuota', async () => {
    await service.setQuota('t1', 'graph.writes', 10, 'daily');
    await service.assert({ tenantId: 't1', dimension: 'graph.writes', quantity: 7 });

    let quota = await service.getQuota('t1', 'graph.writes');
    expect(quota?.used).toBe(7);

    await service.resetQuota('t1', 'graph.writes');
    quota = await service.getQuota('t1', 'graph.writes');
    expect(quota?.used).toBe(0);
  });
});

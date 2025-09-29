import { AttributeService } from '../src/attribute-service';

describe('AttributeService', () => {
  it('caches subject attributes until invalidated', async () => {
    const service = new AttributeService({ ttlMs: 10_000 });
    const first = await service.getSubjectAttributes('alice');
    const second = await service.getSubjectAttributes('alice');
    expect(second).toBe(first);
    service.invalidateSubject('alice');
    const third = await service.getSubjectAttributes('alice');
    expect(third).not.toBe(first);
    expect(third.tenantId).toBe('tenantA');
  });

  it('builds decision context with supplied ACR', () => {
    const service = new AttributeService();
    const context = service.getDecisionContext('loa2');
    expect(context.currentAcr).toBe('loa2');
    expect(Array.isArray(context.protectedActions)).toBe(true);
  });
});

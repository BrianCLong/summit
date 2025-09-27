import { authorize } from '../services/AuthorizationService.js';

jest.mock('../services/OpaClient.js', () => ({
  OpaClient: { evaluate: jest.fn(async (_policy, input) => {
    return { allow: input.auth.tenantId === input.resource.tenantId };
  }) }
}));

describe('tenant isolation', () => {
  it('denies cross-tenant write', async () => {
    await expect(
      authorize('createEntity', { tenantId: 't2' }, { tenantId: 't1', role: 'Analyst' })
    ).rejects.toThrow('unauthorized');
  });

  it('allows same tenant write', async () => {
    await expect(
      authorize('createEntity', { tenantId: 't1' }, { tenantId: 't1', role: 'Analyst' })
    ).resolves.toBeUndefined();
  });
});

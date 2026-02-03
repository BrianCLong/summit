import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { ActionPolicyService } from '../ActionPolicyService.js';
import type { PreflightRequest } from '../../../../packages/policy-audit/src/types.js';

const baseRequest: PreflightRequest = {
  action: 'DELETE_ACCOUNT',
  actor: { id: 'user-1', tenantId: 't-1', role: 'admin' },
  resource: { id: 'acc-1', type: 'account' },
  context: { currentAcr: 'loa2' } as any,
};

const buildService = (result: any) => {
  const store: any = {
    saved: null,
    saveDecision: jest.fn(async (_preflightId, requestHash, decision) => {
      store.saved = {
        decision,
        requestHash,
        policyName: decision.policyVersion || 'actions',
      };
    }),
    getDecision: jest.fn(async () => store.saved),
  };

  const service = new ActionPolicyService({ store });
  (service as any).http = {
    post: jest.fn().mockResolvedValue({ data: { result } }),
  };

  return { service, store };
};

describe('ActionPolicyService', () => {
  it('runs preflight and validates execution when hashes match', async () => {
    const { service } = buildService({ allow: true, obligations: [] });
    const preflight = await service.preflight(baseRequest, {
      correlationId: 'corr-1',
    });

    expect(preflight.decision.allow).toBe(true);
    expect(preflight.requestHash).toBeDefined();

    const execution = await service.validateExecution(
      preflight.preflightId,
      baseRequest,
    );

    expect(execution.status).toBe('ok');
  });

  it('blocks execution when preflight denied', async () => {
    const { service } = buildService({ allow: false, reason: 'deny' });
    const preflight = await service.preflight(baseRequest);

    const execution = await service.validateExecution(
      preflight.preflightId,
      baseRequest,
    );

    expect(execution.status).toBe('blocked');
  });

  it('blocks execution when obligations are unsatisfied', async () => {
    const { service } = buildService({
      allow: true,
      obligations: [{ code: 'DUAL_CONTROL', satisfied: false }],
    });
    const preflight = await service.preflight(baseRequest);

    const execution = await service.validateExecution(
      preflight.preflightId,
      baseRequest,
    );

    expect(execution.status).toBe('blocked');
  });

  it('flags execution when request hash differs from preflight', async () => {
    const { service } = buildService({ allow: true, obligations: [] });
    const preflight = await service.preflight(baseRequest);

    const changedRequest = {
      ...baseRequest,
      resource: { ...baseRequest.resource, id: 'other' },
    };

    const execution = await service.validateExecution(
      preflight.preflightId,
      changedRequest,
    );

    expect(execution.status).toBe('hash_mismatch');
  });

  it('expires preflight decisions when TTL has passed', async () => {
    const { service, store } = buildService({ allow: true, obligations: [] });
    const preflight = await service.preflight(baseRequest);
    store.saved.decision.expiresAt = new Date(Date.now() - 1000).toISOString();

    const execution = await service.validateExecution(
      preflight.preflightId,
      baseRequest,
    );

    expect(execution.status).toBe('expired');
  });
});

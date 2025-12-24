import {
  ActionPolicyError,
  ActionPolicyService,
} from '../ActionPolicyService.js';
import type { PreflightRequest } from '@intelgraph/policy-types';

const baseRequest: PreflightRequest = {
  action: 'DELETE_ACCOUNT',
  subject: { id: 'user-1', tenantId: 't-1', roles: ['admin'] },
  resource: { id: 'acc-1', tenantId: 't-1', classification: 'confidential' },
  context: { currentAcr: 'loa2' },
};

function buildService(result: any, ttlSeconds: number = 60): ActionPolicyService {
  return new ActionPolicyService({
    ttlSeconds,
    opaClient: {
      post: jest.fn<() => Promise<{ data: { result: any } }>>().mockResolvedValue({ data: { result } }),
    } as any,
    persistDecisions: false,
  });
}

describe('ActionPolicyService', () => {
  it('runs preflight and allows execution when hashes match', async () => {
    const service = buildService({ allow: true, obligations: [] });

    const preflight = await service.runPreflight(baseRequest, {
      correlationId: 'corr-1',
    });

    expect(preflight.allow).toBe(true);
    expect(preflight.requestHash).toBeDefined();

    const execution = await service.assertExecutable(
      preflight.preflightId,
      baseRequest,
      [
        { id: 'approver-1' },
        { id: 'approver-2' },
      ],
    );

    expect(execution.preflightId).toBe(preflight.preflightId);
    expect(execution.requestHash).toBe(preflight.requestHash);
  });

  it('blocks execution when preflight denied', async () => {
    const service = buildService({ allow: false, reason: 'deny' });

    const preflight = await service.runPreflight(baseRequest);

    await expect(
      service.assertExecutable(preflight.preflightId, baseRequest),
    ).rejects.toMatchObject({
      code: 'preflight_denied',
      status: 403,
    });
  });

  it('rejects overlapping approvers for dual-control obligations', async () => {
    const service = buildService({
      allow: true,
      obligations: [{ type: 'dual_control' }],
    });

    const preflight = await service.runPreflight(baseRequest);

    await expect(
      service.assertExecutable(preflight.preflightId, baseRequest, [
        { id: 'approver-1' },
        { id: 'approver-1' },
      ]),
    ).rejects.toBeInstanceOf(ActionPolicyError);
  });

  it('rejects execution when request hash differs from preflight', async () => {
    const service = buildService({ allow: true, obligations: [] });
    const preflight = await service.runPreflight(baseRequest);

    const changedRequest = {
      ...baseRequest,
      resource: { ...baseRequest.resource, id: 'other' },
    };

    await expect(
      service.assertExecutable(preflight.preflightId, changedRequest, [
        { id: 'approver-1' },
        { id: 'approver-2' },
      ]),
    ).rejects.toMatchObject({ code: 'request_hash_mismatch' });
  });

  it('expires preflight decisions based on TTL', async () => {
    const service = buildService({ allow: true, obligations: [] }, 0);
    const preflight = await service.runPreflight(baseRequest);
    await new Promise((resolve) => setTimeout(resolve, 2));

    await expect(
      service.assertExecutable(preflight.preflightId, baseRequest, [
        { id: 'a' },
        { id: 'b' },
      ]),
    ).rejects.toMatchObject({
      code: 'preflight_expired',
    });
  });
});

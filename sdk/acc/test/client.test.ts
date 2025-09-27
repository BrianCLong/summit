import { describe, expect, it, vi } from 'vitest';
import {
  ACCClient,
  explainSummary,
  PlanRequest,
  PlanResponse,
  withPolicyTags
} from '../src/index.js';

const samplePlan: PlanResponse = {
  mode: 'strong',
  stalenessSlaMs: 0,
  route: {
    quorum: ['us-east-primary', 'us-west-sync'],
    replicas: [
      {
        name: 'us-east-primary',
        region: 'us-east',
        role: 'primary',
        latencyMs: 8,
        stalenessMs: 1,
        isQuorum: true,
        isPrimary: true,
        syncRequired: true
      }
    ],
    estimatedLatencyMs: 8,
    consistencyScore: 1,
    boundedStalenessSla: 0
  },
  explain: [
    { stage: 'policy-match', message: 'matched policy rule' },
    { stage: 'route', message: 'selected quorum', meta: { quorum: ['us-east-primary'] } }
  ]
};

describe('ACCClient', () => {
  it('sends plan requests with deterministic payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => samplePlan
    });

    const client = new ACCClient({ baseUrl: 'http://acc:8088', fetchImpl: fetchMock as any });

    const request: PlanRequest = {
      id: 'req-1',
      operation: 'read',
      dataClass: 'pii',
      purpose: 'authentication',
      jurisdiction: 'us'
    };

    const plan = await client.plan(request);

    expect(fetchMock).toHaveBeenCalledWith('http://acc:8088/plan', expect.any(Object));
    expect(plan.mode).toBe('strong');
    expect(explainSummary(plan)).toBe('strong via policy-match -> route');
  });

  it('raises errors with response payload when plan fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => 'no matching policy rule'
    });
    const client = new ACCClient({ baseUrl: 'http://acc:8088', fetchImpl: fetchMock as any });

    await expect(
      client.plan({
        operation: 'read',
        dataClass: 'unknown',
        purpose: 'none',
        jurisdiction: 'na'
      })
    ).rejects.toThrow(/no matching policy rule/);
  });

  it('updates replica metrics', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => samplePlan })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'updated' }) });

    const client = new ACCClient({ baseUrl: 'http://acc:8088', fetchImpl: fetchMock as any });
    await client.plan({
      operation: 'read',
      dataClass: 'pii',
      purpose: 'authentication',
      jurisdiction: 'us'
    });
    await client.updateReplicaMetrics({ name: 'us-east-primary', latencyMs: 6, stalenessMs: 10 });

    expect(fetchMock).toHaveBeenNthCalledWith(2, 'http://acc:8088/replica', expect.any(Object));
  });

  it('decorates arbitrary request objects with policy headers', () => {
    const headers = withPolicyTags({}, {
      dataClass: 'behavioral',
      purpose: 'personalization',
      jurisdiction: 'us'
    });

    expect(headers['x-acc-data-class']).toBe('behavioral');
  });
});

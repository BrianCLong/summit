import { GCMClient, GCMGuardrailError, JobChargeResponse, JobRequest, JobErrorResponse } from '../src/gcm';

describe('GCMClient', () => {
  const baseUrl = 'https://metering.local';

  const successfulJob: JobChargeResponse = {
    jobId: 'job-1',
    accountId: 'acct',
    policyTier: 'pii.low',
    residency: 'global',
    usage: { cpuHours: 1, storageGb: 0, egressGb: 0 },
    charges: { components: { cpu: 0.2 }, total: 0.2, currency: 'USD' },
    manifestId: 'manifest-1',
    recordedAt: new Date().toISOString(),
  };

  const makeFetch = (status: number, payload: unknown) =>
    jest.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: async () => payload,
    });

  it('submits a job and returns the manifest response', async () => {
    const fetchMock = makeFetch(201, successfulJob);
    const client = new GCMClient({ baseUrl, fetchImpl: fetchMock });
    const request: JobRequest = {
      accountId: 'acct',
      policyTier: 'pii.low',
      residency: 'global',
      usage: { cpuHours: 1, storageGb: 0, egressGb: 0 },
    };

    const response = await client.submitJob(request);

    expect(response).toEqual(successfulJob);
    expect(fetchMock).toHaveBeenCalledWith(`${baseUrl}/api/v1/jobs`, expect.objectContaining({ method: 'POST' }));
  });

  it('throws a guardrail error when the service rejects a job', async () => {
    const guardrail: JobErrorResponse = {
      allowed: false,
      reason: 'budget_guardrail_triggered',
      violation: {
        accountId: 'acct',
        policyTier: 'pii.low',
        residency: 'global',
        budgetLimit: 10,
        budgetConsumed: 9,
        attemptedCost: 2,
        currency: 'USD',
        requiredHeadroom: 1,
        explainPath: ['insufficient headroom'],
      },
    };
    const fetchMock = makeFetch(409, guardrail);
    const client = new GCMClient({ baseUrl, fetchImpl: fetchMock });

    await expect(
      client.submitJob({ accountId: 'acct', policyTier: 'pii.low', residency: 'global', usage: { cpuHours: 5, storageGb: 0, egressGb: 0 } }),
    ).rejects.toBeInstanceOf(GCMGuardrailError);
  });

  it('returns reconciliation summaries', async () => {
    const summary = {
      accountId: 'acct',
      currency: 'USD',
      tolerance: 0.02,
      deltas: [],
      totalDelta: 0,
      withinTolerance: true,
      generatedAt: new Date().toISOString(),
    };
    const fetchMock = makeFetch(200, summary);
    const client = new GCMClient({ baseUrl, fetchImpl: fetchMock });
    const result = await client.getReconciliation('acct');
    expect(result).toEqual(summary);
    expect(fetchMock).toHaveBeenCalledWith(`${baseUrl}/api/v1/accounts/acct/reconciliation`, expect.any(Object));
  });
});

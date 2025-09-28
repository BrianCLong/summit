import { PdaClient } from '../../src/pda/client';
import { RuleUpdate } from '../../src/pda/types';

describe('PdaClient', () => {
  const baseUrl = 'http://localhost:8086';
  let capturedRequest: { url: string; init?: RequestInit } | undefined;

  const fetchImpl: typeof fetch = (url, init) => {
    capturedRequest = { url: url.toString(), init };
    return Promise.resolve(
      new Response(
        JSON.stringify(
          url.toString().includes('health')
            ? { status: 'ok', time: '2024-01-01T00:00:00Z', fpRate: 0, contracts: 1 }
            : url.toString().includes('alerts')
              ? []
              : { drift: false, suppressed: false, owner: 'growth-ops', reason: 'aligned', falsePositive: false, trace: {} },
        ),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    ) as Promise<Response>;
  };

  beforeEach(() => {
    capturedRequest = undefined;
  });

  it('sends events to the evaluator endpoint', async () => {
    const client = new PdaClient({ baseUrl, fetchImpl });
    await client.submitEvent({
      id: 'evt-1',
      consentId: 'consent-a',
      declaredPurpose: 'analytics',
      endpoint: '/collect',
      endpointPurpose: 'analytics',
      observedAt: '2024-01-01T00:00:00Z',
    });
    expect(capturedRequest?.url).toBe(`${baseUrl}/api/v1/events`);
    expect(capturedRequest?.init?.method).toBe('POST');
  });

  it('streams rule updates as NDJSON', async () => {
    const client = new PdaClient({ baseUrl, fetchImpl });
    const updates: RuleUpdate[] = [
      {
        contractId: 'consent-a',
        policy: { endpointPurpose: 'marketing', allowedPurposes: ['marketing'] },
      },
    ];
    await client.pushRuleStream(updates);
    expect(capturedRequest?.url).toBe(`${baseUrl}/api/v1/rules/stream`);
    expect(capturedRequest?.init?.body).toBe(JSON.stringify(updates[0]));
    expect((capturedRequest?.init?.headers as Record<string, string>)['Content-Type']).toBe('application/x-ndjson');
  });

  it('fetches health status with defaults', async () => {
    const client = new PdaClient({ baseUrl, fetchImpl });
    const health = await client.health();
    expect(health.status).toBe('ok');
  });
});


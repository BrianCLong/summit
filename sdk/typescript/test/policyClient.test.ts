import { PolicyClient } from '../src/policy/client';

describe('PolicyClient', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.useRealTimers();
    jest.resetAllMocks();
  });

  it('returns decisions from the OPA API', async () => {
    const mockFetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ result: { allow: true, reason: 'authorized' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    global.fetch = mockFetch as unknown as typeof fetch;
    const client = new PolicyClient({ baseUrl: 'http://opa.local' });
    const decision = await client.evaluate({
      subject: { id: 'user-1' },
      resource: { id: 'res-1' },
      action: 'read',
      context: { tenant: 'acme' },
    });
    expect(decision).toEqual({ allow: true, reason: 'authorized' });
    expect(mockFetch).toHaveBeenCalledWith(
      'http://opa.local/v1/data/policy/decision',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('surfaces HTTP errors with response body', async () => {
    const mockFetch = jest.fn().mockResolvedValue(
      new Response('denied', { status: 403, statusText: 'Forbidden' }),
    );
    global.fetch = mockFetch as unknown as typeof fetch;
    const client = new PolicyClient({ baseUrl: 'http://opa.local' });
    await expect(
      client.evaluate({
        subject: {},
        resource: {},
        action: 'read',
        context: {},
      }),
    ).rejects.toThrow(/OPA HTTP 403/);
  });

  it('translates abort errors into timeouts', async () => {
    jest.useFakeTimers();
    const mockFetch = jest.fn().mockRejectedValue(Object.assign(new Error('aborted'), { name: 'AbortError' }));
    global.fetch = mockFetch as unknown as typeof fetch;
    const client = new PolicyClient({ baseUrl: 'http://opa.local', timeoutMs: 10 });
    const promise = client.evaluate({ subject: {}, resource: {}, action: 'read', context: {} });
    jest.runAllTimers();
    await expect(promise).rejects.toThrow(/timed out/);
  });
});

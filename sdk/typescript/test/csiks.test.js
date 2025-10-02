import { CsiksClient } from '../src/csiks';

describe('CsiksClient', () => {
  it('serializes camelCase payloads into snake_case', async () => {
    const fetchMock = jest.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            idempotency_key: 'abc',
            expires_at: '2024-01-01T00:00:00Z',
            status: 'pending',
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          },
        ),
      ),
    );

    const client = new CsiksClient({ baseUrl: 'http://localhost', fetchImpl: fetchMock });
    const response = await client.issueKey({
      tenant: 'tenant',
      action: 'action',
      resource: 'resource',
      ttlSeconds: 120,
      issuedBy: 'issuer',
    });

    expect(response.idempotencyKey).toBe('abc');
    expect(response.status).toBe('pending');

    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body);
    expect(body.ttl_seconds).toBe(120);
    expect(body.issued_by).toBe('issuer');
  });

  it('wraps non-2xx responses in CsiksError', async () => {
    const fetchMock = jest.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ error: 'conflict: fingerprint mismatch' }), {
          status: 409,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    );

    const client = new CsiksClient({ baseUrl: 'http://localhost', fetchImpl: fetchMock });
    await expect(
      client.verifyKey({
        tenant: 't',
        action: 'a',
        resource: 'r',
        idempotencyKey: 'key',
      }),
    ).rejects.toMatchObject({
      status: 409,
      message: 'conflict: fingerprint mismatch',
    });
  });
});

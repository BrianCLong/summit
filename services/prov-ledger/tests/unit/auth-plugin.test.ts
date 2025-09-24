import Fastify from 'fastify';
import sensible from '@fastify/sensible';
import authPlugin from '../../src/plugins/auth';
import { TEST_JWKS } from '../helpers/jwk-fixture';
import { issueTestToken } from '../helpers/jwt';

describe('auth plugin', () => {
  async function buildApp(
    allowTestTokens = false,
    overrides: Partial<{
      jwksJson?: string;
      jwksUrl?: string;
      allowTestTokens?: boolean;
      audience?: string;
      issuer?: string;
    }> = {}
  ) {
    const app = Fastify();
    await app.register(sensible);
    await app.register(authPlugin, {
      config: {
        issuer: overrides.issuer ?? 'test-suite',
        audience: overrides.audience ?? 'prov-ledger',
        jwksJson:
          Object.prototype.hasOwnProperty.call(overrides, 'jwksJson')
            ? overrides.jwksJson
            : JSON.stringify(TEST_JWKS),
        jwksUrl: overrides.jwksUrl,
        allowTestTokens: overrides.allowTestTokens ?? allowTestTokens
      }
    });
    app.get('/secure', async request => ({ user: request.user }));
    return app;
  }

  it('rejects requests without authorization header', async () => {
    const app = await buildApp();
    const response = await app.inject({ method: 'GET', url: '/secure' });
    expect(response.statusCode).toBe(401);
    await app.close();
  });

  it('allows bearer sample token when enabled', async () => {
    const app = await buildApp(true);
    const response = await app.inject({
      method: 'GET',
      url: '/secure',
      headers: { authorization: 'Bearer sample' }
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ user: { sub: 'test-suite' } });
    await app.close();
  });

  it('validates signed JWTs using JWKS', async () => {
    const app = await buildApp();
    const token = await issueTestToken('auth-user', '1m');
    const response = await app.inject({
      method: 'GET',
      url: '/secure',
      headers: { authorization: `Bearer ${token}` }
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().user.sub).toBe('auth-user');
    await app.close();
  });

  it('rejects invalid tokens', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/secure',
      headers: { authorization: 'Bearer invalid-token' }
    });
    expect(response.statusCode).toBe(401);
    await app.close();
  });

  it('skips authentication for public routes', async () => {
    const app = await buildApp();
    app.get('/healthz', async () => ({ status: 'ok' }));
    const response = await app.inject({ method: 'GET', url: '/healthz' });
    expect(response.statusCode).toBe(200);
    await app.close();
  });

  it('skips authentication for public routes with trailing slash', async () => {
    const app = await buildApp();
    app.get('/metrics/', async () => ({ metrics: true }));
    const response = await app.inject({ method: 'GET', url: '/metrics/' });
    expect(response.statusCode).toBe(200);
    await app.close();
  });

  it('skips authentication for public routes with query strings', async () => {
    const app = await buildApp();
    app.get('/readyz', async () => ({ ready: true }));
    const response = await app.inject({ method: 'GET', url: '/readyz?detail=full' });
    expect(response.statusCode).toBe(200);
    await app.close();
  });

  it('loads JWKS from a remote URL', async () => {
    const originalFetch = (global as any).fetch;
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => TEST_JWKS
    });
    (global as any).fetch = fetchMock;

    const app = await buildApp(false, { jwksJson: undefined, jwksUrl: 'https://example.org/jwks' });
    const token = await issueTestToken('remote-user', '1m');
    const response = await app.inject({
      method: 'GET',
      url: '/secure',
      headers: { authorization: `Bearer ${token}` }
    });
    expect(response.statusCode).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith('https://example.org/jwks');

    await app.close();
    (global as any).fetch = originalFetch;
  });

  it('throws when JWKS download fails', async () => {
    const originalFetch = (global as any).fetch;
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 });

    await expect(
      buildApp(false, { jwksJson: undefined, jwksUrl: 'https://example.org/jwks' })
    ).rejects.toThrow('Failed to download JWKS (500)');

    (global as any).fetch = originalFetch;
  });

  it('throws when JWKS configuration is missing', async () => {
    await expect(buildApp(false, { jwksJson: undefined, jwksUrl: undefined })).rejects.toThrow(
      'JWKS configuration missing'
    );
  });
});

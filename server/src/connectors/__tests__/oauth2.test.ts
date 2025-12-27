import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';

const encryptionKey = 'a'.repeat(64);

describe('OAuth2PKCEClient', () => {
  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
    process.env.NEO4J_URI = 'bolt://localhost:7687';
    process.env.NEO4J_USER = 'neo4j';
    process.env.NEO4J_PASSWORD = 'devpassword';
    process.env.JWT_SECRET = 'test-jwt-secret-should-be-32-chars-minimum';
    process.env.JWT_REFRESH_SECRET =
      'test-refresh-secret-should-be-32-chars-minimum';
    process.env.SESSION_SECRET =
      'test-session-secret-should-be-32-chars-minimum';
    process.env.ENCRYPTION_KEY = encryptionKey;
  });

  beforeEach(() => {
    jest.resetModules();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('rotates refresh tokens and stores them encrypted', async () => {
    const { OAuth2PKCEClient } = await import('../oauth2.js');
    const { TokenVaultService } = await import('../../services/TokenVaultService.js');

    const vault = new TokenVaultService();
    const client = new OAuth2PKCEClient(
      {
        clientId: 'client-id',
        clientSecret: 'client-secret',
        redirectUri: 'https://app.local/oauth/callback',
        authorizationEndpoint: 'https://accounts.example.com/auth',
        tokenEndpoint: 'https://accounts.example.com/token',
        scopes: ['scope.read'],
      },
      vault,
    );

    vault.storeTokens('connection-1', {
      accessToken: 'old-access',
      refreshToken: 'old-refresh',
      expiresAt: Date.now() + 1000,
      scope: 'scope.read',
      tokenType: 'Bearer',
    });

    const fetchMock = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        access_token: 'new-access',
        refresh_token: 'new-refresh',
        expires_in: 7200,
        scope: 'scope.read',
        token_type: 'Bearer',
      }),
      text: async () => '',
    }));

    (globalThis as any).fetch = fetchMock;

    const tokens = await client.refreshTokens('connection-1');

    expect(tokens.refreshToken).toBe('new-refresh');

    const stored = vault.getTokens('connection-1');
    expect(stored?.refreshToken).toBe('new-refresh');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('stamps consent and terms metadata into connector events', async () => {
    const { BaseConnector } = await import('../base.js');

    class TestConnector extends BaseConnector {
      async connect(): Promise<void> {}
      async disconnect(): Promise<void> {}
      async testConnection(): Promise<boolean> {
        return true;
      }
      async fetchSchema(): Promise<any> {
        return { fields: [], version: 1 };
      }
      async readStream(): Promise<any> {
        return null;
      }
      public wrap(data: any) {
        return this.wrapEvent(data);
      }
    }

    const connector = new TestConnector({
      id: 'connector-1',
      name: 'Test Connector',
      type: 'test',
      tenantId: 'tenant-1',
      config: {},
      metadata: {
        consent: {
          status: 'granted',
          scopes: ['scope.read'],
        },
        termsUrl: 'https://intelgraph.local/terms',
      },
    });

    const event = connector.wrap({ hello: 'world' });

    expect(event.provenance.consent?.status).toBe('granted');
    expect(event.provenance.termsUrl).toBe('https://intelgraph.local/terms');
  });
});

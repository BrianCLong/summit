import request from 'supertest';
import { createApp } from '../src/index';
import { issueServiceToken } from '../src/service-auth';
import { stopObservability } from '../src/observability';
import { authorize } from '../src/policy';

jest.mock('../src/policy');

const mockedAuthorize = authorize as jest.MockedFunction<typeof authorize>;

describe('adapter simulation endpoint', () => {
  let serviceToken: string;

  beforeAll(async () => {
    serviceToken = await issueServiceToken({
      audience: 'authz-gateway',
      serviceId: 'api-gateway',
      scopes: ['abac:simulate'],
    });
  });

  afterAll(async () => {
    await stopObservability();
  });

  beforeEach(() => {
    mockedAuthorize.mockResolvedValue({
      allowed: true,
      reason: 'allow',
      obligations: [],
    });
  });

  it('returns 404 for unknown adapters', async () => {
    const app = await createApp();
    const res = await request(app)
      .post('/adapters/unknown-adapter/simulate')
      .set('x-service-token', serviceToken)
      .send({ subjectId: 'bob' });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('adapter_not_found');
  });

  it('enforces manifest permissions before ABAC evaluation', async () => {
    const app = await createApp();
    const res = await request(app)
      .post('/adapters/agent.dispatch/simulate')
      .set('x-service-token', serviceToken)
      .send({ subjectId: 'alice', action: 'adapter:invoke' });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('missing_permissions');
    expect(mockedAuthorize).not.toHaveBeenCalled();
  });

  it('includes adapter claims and retries in authorization and receipt', async () => {
    const app = await createApp();
    const res = await request(app)
      .post('/adapters/agent.dispatch/simulate')
      .set('x-service-token', serviceToken)
      .send({
        subjectId: 'bob',
        action: 'adapter:invoke',
        retries: 1,
        resource: {
          tags: ['urgent'],
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.adapter.requiredPermissions).toContain('dataset:beta:write');
    expect(res.body.receipt.retries).toBe(1);
    expect(mockedAuthorize).toHaveBeenCalledWith(
      expect.objectContaining({
        resource: expect.objectContaining({
          adapterId: 'agent.dispatch',
          requiredPermissions: expect.arrayContaining(['dataset:beta:write']),
          claims: expect.objectContaining({ dualControl: true }),
        }),
        context: expect.objectContaining({
          adapterId: 'agent.dispatch',
          retries: 1,
        }),
      }),
    );
  });
});
jest.mock('jose', () => {
  const jwtVerify = jest.fn().mockResolvedValue({
    payload: { sub: 'api-gateway', scp: ['abac:simulate'], acr: 'loa1', sid: 'sess-1' },
    protectedHeader: { kid: 'kid' },
  });

  class SignJWT {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(private payload: any) {}
    // chainable setters
    setProtectedHeader() {
      return this;
    }
    setSubject() {
      return this;
    }
    setIssuer() {
      return this;
    }
    setAudience() {
      return this;
    }
    setIssuedAt() {
      return this;
    }
    setExpirationTime() {
      return this;
    }
    async sign() {
      return 'service-token';
    }
  }

  return {
    SignJWT,
    jwtVerify,
    generateKeyPair: jest.fn().mockResolvedValue({
      publicKey: {},
      privateKey: {},
    }),
    exportJWK: jest.fn().mockResolvedValue({}),
  };
});

jest.mock('../src/keys', () => ({
  initKeys: jest.fn().mockResolvedValue(undefined),
  getPublicJwk: jest.fn().mockReturnValue({}),
  getPrivateKey: jest.fn(),
  getPublicKey: jest.fn(),
}));

jest.mock('../src/observability', () => ({
  startObservability: jest.fn(),
  stopObservability: jest.fn(),
  metricsHandler: jest.fn((_req, res) => res.status(200).end()),
  requestMetricsMiddleware: (_req: unknown, _res: unknown, next: () => void) => next(),
  tracingContextMiddleware: (_req: unknown, _res: unknown, next: () => void) => next(),
  injectTraceContext: jest.fn(),
}));

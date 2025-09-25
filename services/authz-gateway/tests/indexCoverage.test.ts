import request from 'supertest';

describe('gateway edge-case handling', () => {
  afterEach(async () => {
    const config = await import('../src/config');
    config.setFeatureOverrides({ policyReasoner: true });
    jest.clearAllMocks();
    jest.resetModules();
  });

  it('rejects invalid login attempts', async () => {
    jest.resetModules();
    const { createApp } = await import('../src/index');
    const { stopObservability } = await import('../src/observability');
    const app = await createApp();
    const res = await request(app)
      .post('/auth/login')
      .send({ username: 'alice', password: 'wrong-password' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('invalid_credentials');
    await stopObservability();
  });

  it('surfaces step-up signing errors', async () => {
    jest.resetModules();
    jest.doMock('../src/keys', () => {
      const actual = jest.requireActual('../src/keys');
      let shouldThrow = false;
      return {
        ...actual,
        async initKeys() {
          await actual.initKeys();
        },
        getPrivateKey: jest.fn(() => {
          if (shouldThrow) {
            throw new Error('sign failure');
          }
          return actual.getPrivateKey();
        }),
        __setThrowOnGet(value: boolean) {
          shouldThrow = value;
        },
      };
    });
    const { createApp } = await import('../src/index');
    const { stopObservability } = await import('../src/observability');
    const keys = await import('../src/keys');
    const app = await createApp();
    const login = await request(app)
      .post('/auth/login')
      .send({ username: 'alice', password: 'password123' });
    (keys as Record<string, unknown>).__setThrowOnGet?.(true);
    const stepUp = await request(app)
      .post('/auth/step-up')
      .set('Authorization', `Bearer ${login.body.token}`)
      .set('x-tenant-id', 'tenantA')
      .set('x-purpose', 'treatment')
      .set('x-authority', 'hipaa');
    expect(stepUp.status).toBe(500);
    expect(stepUp.body.error).toBe('step_up_failed');
    await stopObservability();
  });

  it('disables dry-run when the policy reasoner feature flag is off', async () => {
    jest.resetModules();
    const config = await import('../src/config');
    config.setFeatureOverrides({ policyReasoner: false });
    const { createApp } = await import('../src/index');
    const { stopObservability } = await import('../src/observability');
    const app = await createApp();
    const res = await request(app).post('/policy/dry-run').send({});
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('policy_reasoner_disabled');
    await stopObservability();
  });

  it('returns a bad request when dry-run evaluation fails', async () => {
    jest.resetModules();
    jest.doMock('../src/policy', () => {
      const actual = jest.requireActual('../src/policy');
      return {
        ...actual,
        dryRun: jest.fn().mockRejectedValue(new Error('dry-run failure')),
      };
    });
    const { createApp } = await import('../src/index');
    const { stopObservability } = await import('../src/observability');
    const app = await createApp();
    const res = await request(app)
      .post('/policy/dry-run')
      .send({ user: {}, resource: { path: '/protected/resource' } });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_dry_run_request');
    await stopObservability();
  });

  it('returns not found for unknown audit identifiers', async () => {
    jest.resetModules();
    const { createApp } = await import('../src/index');
    const { stopObservability } = await import('../src/observability');
    const app = await createApp();
    const res = await request(app).get('/audit/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('not_found');
    await stopObservability();
  });
});

describe('server bootstrap behavior', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    jest.clearAllMocks();
    jest.resetModules();
  });

  it('starts listening automatically outside the test environment', async () => {
    jest.resetModules();
    process.env.NODE_ENV = 'production';
    type MockExpressApp = {
      use: jest.Mock;
      get: jest.Mock;
      post: jest.Mock;
      listen: jest.Mock<
        import('http').Server,
        [unknown, (() => void) | undefined]
      >;
    };
    let listen: MockExpressApp['listen'];
    let expressMock: jest.Mock<() => MockExpressApp>;

    await new Promise<void>((resolve, reject) => {
      let settled = false;
      listen = jest.fn((_port: unknown, cb?: () => void) => {
        cb?.();
        if (!settled) {
          settled = true;
          resolve();
        }
        return undefined as unknown as import('http').Server;
      });
      const appInstance: MockExpressApp = {
        use: jest.fn(),
        get: jest.fn(),
        post: jest.fn(),
        listen,
      };
      expressMock = Object.assign(
        jest.fn(() => appInstance),
        {
          json: jest.fn(
            () => (_req: unknown, _res: unknown, next?: () => void) => {
              next?.();
            },
          ),
        },
      );

      jest.doMock('express', () => expressMock);
      jest.doMock('http-proxy-middleware', () => ({
        createProxyMiddleware: jest.fn(
          () => (_req: unknown, _res: unknown, next?: () => void) => {
            next?.();
          },
        ),
      }));
      jest.doMock('pino', () => jest.fn(() => ({ info: jest.fn() })));
      jest.doMock('pino-http', () =>
        jest.fn(() => (_req: unknown, _res: unknown, next?: () => void) => {
          next?.();
        }),
      );
      jest.doMock('../src/keys', () => ({
        initKeys: jest.fn().mockResolvedValue(undefined),
        getPublicJwk: jest.fn(() => ({})),
        getPrivateKey: jest.fn(() => ({}) as import('jose').KeyLike),
      }));
      jest.doMock('../src/auth', () => ({
        login: jest.fn().mockResolvedValue('token'),
        introspect: jest.fn().mockResolvedValue({}),
      }));
      jest.doMock('../src/middleware', () => ({
        requireAuth:
          () => (_req: unknown, _res: unknown, next?: () => void) => {
            next?.();
          },
      }));
      jest.doMock('../src/observability', () => ({
        startObservability: jest.fn().mockResolvedValue(undefined),
        metricsHandler: jest.fn(),
      }));
      jest.doMock('../src/policy', () => ({
        dryRun: jest.fn().mockResolvedValue({
          decision: {
            allowed: true,
            reason: 'ok',
            policyId: 'policy.test',
            policyVersion: '1',
            appealLink: '#',
            appealToken: 'token',
            obligations: { redact: [], mask: {} },
          },
          fields: {},
        }),
      }));
      jest.doMock('../src/audit', () => ({
        getAuditEntry: jest.fn(() => null),
      }));
      jest.doMock('../src/config', () => ({
        features: { policyReasoner: true },
      }));

      jest.isolateModules(() => {
        import('../src/index').catch((err) => {
          if (!settled) {
            settled = true;
            reject(err);
          }
        });
      });
    });

    expect(expressMock!).toHaveBeenCalled();
    expect(listen!).toHaveBeenCalled();
  });
});

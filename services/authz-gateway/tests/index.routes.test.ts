import {
  beforeEach,
  afterEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import request from 'supertest';
import type { Span } from '@opentelemetry/api';
import type { NextFunction, Request, RequestHandler, Response } from 'express';

interface SetupOptions {
  loginImpl?: jest.Mock;
  signImpl?: jest.Mock;
  proxyHandler?: RequestHandler;
  traceGetSpan?: jest.Mock;
}

async function loadApp({
  loginImpl,
  signImpl,
  proxyHandler,
  traceGetSpan,
}: SetupOptions = {}) {
  const startObservability = jest.fn(async () => undefined);
  const annotateActiveSpan = jest.fn();
  const recordGraphqlDuration = jest.fn();
  const recordErrorRate = jest.fn();
  const buildLogContext = jest.fn().mockImplementation((tenant?: string) => ({
    service: 'authz-gateway-test',
    environment: 'test',
    purpose: 'authz',
    tenant: tenant ?? 'unknown',
  }));
  const metricsHandler = jest.fn((_req: Request, res: Response) => {
    res.setHeader?.('Content-Type', 'text/plain');
    res.end('metrics');
  });

  let capturedMixin: (() => Record<string, unknown>) | undefined;

  if (traceGetSpan) {
    const actualOtel = jest.requireActual(
      '@opentelemetry/api',
    ) as typeof import('@opentelemetry/api');
    jest.doMock('@opentelemetry/api', () => ({
      ...actualOtel,
      trace: Object.assign({}, actualOtel.trace, {
        getSpan: traceGetSpan as unknown,
      }),
    }));
  }

  jest.doMock('pino', () =>
    jest.fn().mockImplementation(
      (
        options: Record<string, unknown> & {
          mixin?: () => Record<string, unknown>;
        },
      ) => {
        capturedMixin = options.mixin;
        return { info: jest.fn(), child: jest.fn().mockReturnThis() };
      },
    ),
  );

  jest.doMock('pino-http', () =>
    jest.fn(
      () => (_req: Request, _res: Response, next: NextFunction) => next(),
    ),
  );

  jest.doMock('../src/observability', () => ({
    startObservability,
    metricsHandler,
    annotateActiveSpan,
    recordGraphqlDuration,
    recordErrorRate,
    buildLogContext,
    serviceDimensions: {
      service: 'authz-gateway-test',
      environment: 'test',
      purpose: 'authz',
    },
  }));

  const initKeys = jest.fn(async () => undefined);
  const getPublicJwk = jest.fn(() => ({ kid: 'authz-1', kty: 'RSA' }));
  const getPrivateKey = jest.fn(() => ({}));

  jest.doMock('../src/keys', () => ({ initKeys, getPublicJwk, getPrivateKey }));

  const login = loginImpl ?? jest.fn(async () => 'token');
  const introspect = jest.fn(async () => ({ active: true }));

  jest.doMock('../src/auth', () => ({ login, introspect }));

  jest.doMock('../src/middleware', () => ({
    requireAuth: jest.fn(
      () =>
        (
          req: Request & { user?: { sub: string; tenantId: string } },
          _res: Response,
          next: NextFunction,
        ) => {
          req.user = req.user || { sub: 'alice', tenantId: 'tenantZ' };
          next();
        },
    ),
  }));

  const proxy =
    proxyHandler ??
    ((_req: Request, res: Response) => res.status(200).end('ok'));

  jest.doMock('http-proxy-middleware', () => ({
    createProxyMiddleware: jest.fn(() => proxy),
  }));

  const sign = signImpl ?? jest.fn(async () => 'signed-token');

  jest.doMock('jose', () => ({
    SignJWT: jest.fn().mockImplementation(() => ({
      setProtectedHeader() {
        return this;
      },
      setIssuedAt() {
        return this;
      },
      setExpirationTime() {
        return this;
      },
      sign,
    })),
  }));

  const mod = await import('../src/index');
  return {
    createApp: mod.createApp,
    getCapturedMixin: () => capturedMixin,
    spies: {
      startObservability,
      annotateActiveSpan,
      recordGraphqlDuration,
      recordErrorRate,
      metricsHandler,
      login,
      sign,
    },
    traceGetSpan,
  };
}

const originalEnv = { ...process.env };

describe('createApp instrumentation', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
      DISABLE_SERVER_AUTOSTART: 'true',
    };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('attaches trace context in the logger mixin', async () => {
    const getSpanMock = jest.fn(() => fakeSpan);
    const { createApp, getCapturedMixin } = await loadApp({
      traceGetSpan: getSpanMock,
    });
    await createApp();
    const mixin = getCapturedMixin();
    expect(typeof mixin).toBe('function');

    const spanContext = {
      traceId: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      spanId: 'bbbbbbbbbbbbbbbb',
    } as const;

    const fakeSpan = {
      spanContext: () => spanContext,
      setAttribute() {
        return this;
      },
      setAttributes() {
        return this;
      },
      addEvent() {
        return this;
      },
      addLink() {
        return this;
      },
      addLinks() {
        return this;
      },
      setStatus() {
        return this;
      },
      updateName() {
        return this;
      },
      end() {
        return undefined;
      },
      isRecording: () => true,
      recordException() {
        return undefined;
      },
    } as unknown as Span;

    const result = mixin ? mixin() : {};
    expect(getSpanMock).toHaveBeenCalled();
    expect(result).toEqual({
      trace_id: spanContext.traceId,
      span_id: spanContext.spanId,
    });
  });

  it('returns 401 when login fails', async () => {
    const loginFailure = jest.fn(async () => {
      throw new Error('nope');
    });
    const { createApp } = await loadApp({ loginImpl: loginFailure });
    const app = await createApp();
    const response = await request(app)
      .post('/auth/login')
      .send({ username: 'a', password: 'b' });
    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'invalid_credentials' });
  });

  it('records error rate when proxy responds with failure', async () => {
    const proxyHandler = (_req: Request, res: Response) => {
      res.status(502).send('bad');
    };
    const { createApp, spies } = await loadApp({ proxyHandler });
    const app = await createApp();
    await request(app)
      .post('/protected')
      .set('x-tenant-id', 'tenantZ')
      .send({ query: '{ ok }' });
    expect(spies.recordErrorRate).toHaveBeenCalledWith('tenantZ', 502);
  });

  it('returns 500 when step-up token issuance fails', async () => {
    const failingSign = jest.fn(async () => {
      throw new Error('boom');
    });
    const { createApp } = await loadApp({ signImpl: failingSign });
    const app = await createApp();
    const response = await request(app).post('/auth/step-up').send({});
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'step_up_failed' });
  });

  it('auto-starts the server when autostart is enabled', async () => {
    jest.resetModules();
    process.env.NODE_ENV = 'production';
    process.env.DISABLE_SERVER_AUTOSTART = 'false';

    let resolveInit: (() => void) | undefined;
    let listenMock: jest.Mock | undefined;
    const initKeysMock = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveInit = resolve;
        }),
    );

    jest.doMock('../src/keys', () => ({
      initKeys: initKeysMock,
      getPublicJwk: jest.fn(() => ({ kid: 'autostart', kty: 'RSA' })),
      getPrivateKey: jest.fn(() => ({})),
    }));

    jest.doMock('../src/observability', () => ({
      startObservability: jest.fn(async () => undefined),
      metricsHandler: jest.fn(),
      annotateActiveSpan: jest.fn(),
      recordGraphqlDuration: jest.fn(),
      recordErrorRate: jest.fn(),
      buildLogContext: jest.fn(() => ({})),
      serviceDimensions: {
        service: 'svc',
        environment: 'prod',
        purpose: 'authz',
      },
    }));

    jest.doMock('../src/auth', () => ({
      login: jest.fn(async () => 'token'),
      introspect: jest.fn(async () => ({ active: true })),
    }));

    jest.doMock('../src/middleware', () => ({
      requireAuth: jest.fn(
        () => (_req: Request, _res: Response, next: NextFunction) => next(),
      ),
    }));

    jest.doMock('http-proxy-middleware', () => ({
      createProxyMiddleware: jest.fn(() => (_req: Request, res: Response) => {
        res.end();
      }),
    }));

    jest.doMock('pino', () =>
      jest.fn(() => ({ info: jest.fn(), child: jest.fn().mockReturnThis() })),
    );
    jest.doMock('pino-http', () =>
      jest.fn(
        () => (_req: Request, _res: Response, next: NextFunction) => next(),
      ),
    );

    jest.doMock('express', () => {
      listenMock = jest.fn((_port: unknown, cb: () => void) => {
        cb();
        return { close: jest.fn() };
      });
      const app = {
        use: jest.fn(),
        get: jest.fn(),
        post: jest.fn(),
        listen: listenMock,
      };
      const expressFn = () => app;
      Object.assign(expressFn, {
        json: () => (_req: Request, _res: Response, next: NextFunction) =>
          next(),
      });
      return expressFn;
    });

    jest.doMock('jose', () => ({
      SignJWT: jest.fn().mockImplementation(() => ({
        setProtectedHeader() {
          return this;
        },
        setIssuedAt() {
          return this;
        },
        setExpirationTime() {
          return this;
        },
        sign: jest.fn(async () => 'signed'),
      })),
    }));

    await jest.isolateModulesAsync(async () => {
      await import('../src/index');
      resolveInit?.();
      await new Promise((resolve) => setImmediate(resolve));
    });

    expect(initKeysMock).toHaveBeenCalled();
    expect(listenMock).toHaveBeenCalled();
  });
});

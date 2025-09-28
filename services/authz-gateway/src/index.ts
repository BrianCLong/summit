import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import { context, trace } from '@opentelemetry/api';
import { createProxyMiddleware } from 'http-proxy-middleware';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { initKeys, getPublicJwk, getPrivateKey } from './keys';
import { login, introspect } from './auth';
import { requireAuth, type AuthenticatedRequest } from './middleware';
import {
  startObservability,
  metricsHandler,
  annotateActiveSpan,
  recordGraphqlDuration,
  recordErrorRate,
  serviceDimensions,
  buildLogContext,
} from './observability';

interface ObservabilityLocals {
  tenantId?: string;
  operationName?: string;
}

function getTenantId(req: Request, userTenant?: string) {
  const header = req.headers['x-tenant-id'] || req.headers['x-tenant'];
  if (Array.isArray(header)) {
    const value = header.find((item) => item && item.trim().length > 0);
    if (value) return value.trim();
  }
  if (typeof header === 'string' && header.trim().length > 0) {
    return header.trim();
  }
  if (userTenant) return userTenant;
  return undefined;
}

function resolveOperation(req: Request) {
  const body = req.body as { operationName?: string; query?: string };
  if (body?.operationName) {
    return body.operationName;
  }
  if (typeof body?.query === 'string' && body.query.includes('mutation')) {
    return 'mutation';
  }
  if (typeof body?.query === 'string' && body.query.includes('query')) {
    return 'query';
  }
  return `${req.method} ${req.path}`;
}

export const __testables = {
  getTenantId,
  resolveOperation,
};

export async function createApp() {
  await initKeys();
  await startObservability();
  const app = express();
  const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    base: serviceDimensions,
    mixin() {
      const span = trace.getSpan(context.active());
      if (!span) return {};
      const spanContext = span.spanContext();
      return {
        trace_id: spanContext.traceId,
        span_id: spanContext.spanId,
      };
    },
  });
  app.use(
    pinoHttp({
      logger,
      customProps: (req, res) => {
        const locals = (res.locals || {}) as ObservabilityLocals;
        const tenant = locals.tenantId || getTenantId(req);
        return buildLogContext(tenant);
      },
    }),
  );
  app.use(express.json());
  app.use((req: Request, res: Response, next: NextFunction) => {
    const locals = (res.locals || {}) as ObservabilityLocals;
    const tenantFromUser = (req as AuthenticatedRequest).user?.tenantId as
      | string
      | undefined;
    const tenantId = getTenantId(req, tenantFromUser);
    locals.tenantId = tenantId;
    res.locals = locals;
    annotateActiveSpan(tenantId, {
      'http.route': req.path,
      'http.method': req.method,
    });
    next();
  });

  app.get('/metrics', metricsHandler);

  app.post('/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      const token = await login(username, password);
      res.json({ token });
    } catch {
      res.status(401).json({ error: 'invalid_credentials' });
    }
  });

  app.get('/.well-known/jwks.json', (_req, res) => {
    res.json({ keys: [getPublicJwk()] });
  });

  app.post('/auth/introspect', async (req, res) => {
    try {
      const { token } = req.body;
      const payload = await introspect(token);
      res.json(payload);
    } catch {
      res.status(401).json({ error: 'invalid_token' });
    }
  });

  app.post(
    '/auth/step-up',
    requireAuth({ action: 'step-up' }),
    async (_req, res) => {
      // issue new token with higher ACR
      try {
        const user = (_req as AuthenticatedRequest).user;
        const { SignJWT } = await import('jose');
        const token = await new SignJWT({
          ...user,
          acr: 'loa2',
        })
          .setProtectedHeader({ alg: 'RS256', kid: 'authz-gateway-1' })
          .setIssuedAt()
          .setExpirationTime('1h')
          .sign(getPrivateKey());
        res.json({ token });
      } catch {
        res.status(500).json({ error: 'step_up_failed' });
      }
    },
  );

  const upstream = process.env.UPSTREAM || 'http://localhost:4001';
  app.use(
    '/protected',
    requireAuth({ action: 'read' }),
    (req: Request, res: Response, next: NextFunction) => {
      const locals = (res.locals || {}) as ObservabilityLocals;
      const start = process.hrtime.bigint();
      locals.operationName = resolveOperation(req);
      res.locals = locals;
      res.once('finish', () => {
        const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
        recordGraphqlDuration(
          durationMs,
          locals.tenantId,
          locals.operationName,
        );
        if (res.statusCode >= 500) {
          recordErrorRate(locals.tenantId, res.statusCode);
        }
      });
      next();
    },
    createProxyMiddleware({
      target: upstream,
      changeOrigin: true,
      pathRewrite: { '^/protected': '' },
    }),
  );

  return app;
}

export function startServer(app: Express) {
  const port = process.env.PORT || 4000;
  app.listen(port, () => {
    const startupLogger = pino({ base: serviceDimensions });
    startupLogger.info(`AuthZ Gateway listening on ${port}`);
  });
}

const shouldAutostart =
  process.env.NODE_ENV !== 'test' &&
  process.env.DISABLE_SERVER_AUTOSTART !== 'true';

if (shouldAutostart) {
  createApp().then((app) => {
    startServer(app);
  });
}

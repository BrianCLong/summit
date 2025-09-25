import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { initKeys, getPublicJwk, getPrivateKey } from './keys';
import { login, introspect } from './auth';
import { requireAuth } from './middleware';
import { startObservability, metricsHandler, requestLatency } from './observability';
import { randomUUID } from 'crypto';

export async function createApp() {
  await initKeys();
  await startObservability();
  const app = express();
  const logger = pino();
  app.use((req, res, next) => {
    const headerId = req.header('x-request-id');
    const correlationId = headerId && headerId.trim() ? headerId : randomUUID();
    res.setHeader('x-request-id', correlationId);
    (req as any).reqId = correlationId;
    (req as any).correlationId = correlationId;
    res.locals.correlationId = correlationId;

    const stopTimer = requestLatency.startTimer({ route: req.path || 'unknown', method: req.method });
    res.on('finish', () => {
      stopTimer({ status: String(res.statusCode) });
    });

    next();
  });
  app.use(
    pinoHttp({
      logger,
      customAttributeKeys: { reqId: 'reqId' },
      genReqId: (req) => ((req as any).reqId as string) || randomUUID(),
      customProps: (req) => ({ correlationId: (req as any).correlationId })
    })
  );
  app.use(express.json());

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
        const user = (_req as import('./middleware').AuthenticatedRequest).user;
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
    createProxyMiddleware({
      target: upstream,
      changeOrigin: true,
      pathRewrite: { '^/protected': '' },
    }),
  );

  return app;
}

if (process.env.NODE_ENV !== 'test') {
  createApp().then((app) => {
    const port = process.env.PORT || 4000;
    app.listen(port, () => {
      const logger = pino();
      logger.info(`AuthZ Gateway listening on ${port}`);
    });
  });
}

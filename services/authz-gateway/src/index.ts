import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { initKeys, getPublicJwk, getPrivateKey } from './keys';
import { login, introspect } from './auth';
import { requireAuth } from './middleware';
import { startObservability, metricsHandler } from './observability';
import { dryRun } from './policy';
import { getAuditEntry } from './audit';
import { features } from './config';

export async function createApp() {
  await initKeys();
  await startObservability();
  const app = express();
  const logger = pino();
  app.use(pinoHttp({ logger }));
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

  app.post('/policy/dry-run', async (req, res) => {
    if (!features.policyReasoner) {
      return res.status(404).json({ error: 'policy_reasoner_disabled' });
    }
    try {
      const {
        user = {},
        resource = {},
        action = 'read',
        purpose = '',
        authority = '',
        record,
      } = req.body || {};
      const resourcePath =
        typeof resource.path === 'string' && resource.path.length > 0
          ? resource.path
          : '/dry-run';
      const dryRunResult = await dryRun(
        {
          user: {
            roles: [],
            ...user,
          },
          resource: {
            ...resource,
            path: resourcePath,
          },
          action,
          purpose,
          authority,
        },
        record,
      );
      return res.json({
        allowed: dryRunResult.decision.allowed,
        reason: dryRunResult.decision.reason,
        policyId: dryRunResult.decision.policyId,
        policyVersion: dryRunResult.decision.policyVersion,
        appealLink: dryRunResult.decision.appealLink,
        fields: dryRunResult.fields,
      });
    } catch {
      return res.status(400).json({ error: 'invalid_dry_run_request' });
    }
  });

  app.get('/audit/:id', (req, res) => {
    const record = getAuditEntry(req.params.id);
    if (!record) {
      return res.status(404).json({ error: 'not_found' });
    }
    return res.json(record);
  });

  const upstream = process.env.UPSTREAM || 'http://localhost:4001';
  app.use(
    '/protected',
    requireAuth({ action: 'read' }),
    createProxyMiddleware({
      target: upstream,
      changeOrigin: true,
      pathRewrite: { '^/protected': '' },
      onProxyReq: (proxyReq, req) => {
        if (req.headers['x-purpose']) {
          proxyReq.setHeader('x-purpose', String(req.headers['x-purpose']));
        }
        if (req.headers['x-authority']) {
          proxyReq.setHeader('x-authority', String(req.headers['x-authority']));
        }
      },
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

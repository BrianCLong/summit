import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { initKeys, getPublicJwk, getPrivateKey } from './keys';
import { login, introspect } from './auth';
import { requireAuth } from './middleware';
import {
  startObservability,
  metricsHandler,
  requestMetricsMiddleware,
  tracingContextMiddleware,
  injectTraceContext,
} from './observability';
import { AttributeService } from './attribute-service';
import { StepUpManager } from './stepup';
import { authorize } from './policy';
import type { AuthenticatedRequest } from './middleware';
import type { ResourceAttributes } from './types';

export async function createApp(): Promise<express.Application> {
  await initKeys();
  await startObservability();
  const attributeService = new AttributeService();
  const stepUpManager = new StepUpManager();

  const app: express.Application = express();
  app.use(tracingContextMiddleware);
  app.use(pinoHttp());
  app.use(express.json());
  app.use(requestMetricsMiddleware);

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

  app.get('/subject/:id/attributes', async (req, res) => {
    try {
      const { id } = req.params;
      if (req.query.refresh === 'true') {
        attributeService.invalidateSubject(id);
      }
      const attributes = await attributeService.getSubjectAttributes(id);
      res.json({ data: attributes, schema: attributeService.getIdpSchema() });
    } catch (error) {
      res.status(404).json({ error: (error as Error).message });
    }
  });

  app.get('/resource/:id/attributes', async (req, res) => {
    try {
      const { id } = req.params;
      if (req.query.refresh === 'true') {
        attributeService.invalidateResource(id);
      }
      const resource = await attributeService.getResourceAttributes(id);
      res.json({ data: resource });
    } catch (error) {
      res.status(404).json({ error: (error as Error).message });
    }
  });

  app.post('/authorize', async (req, res) => {
    try {
      const subjectId = req.body?.subject?.id;
      const action = req.body?.action;
      if (!subjectId || !action) {
        return res
          .status(400)
          .json({ error: 'subject_id_and_action_required' });
      }
      const subject = await attributeService.getSubjectAttributes(subjectId);
      let resource: ResourceAttributes;
      if (req.body?.resource?.id) {
        try {
          const fromCatalog = await attributeService.getResourceAttributes(
            req.body.resource.id,
          );
          resource = {
            ...fromCatalog,
            ...req.body.resource,
          };
        } catch (error) {
          if (req.body.resource.tenantId) {
            resource = {
              id: req.body.resource.id,
              tenantId: req.body.resource.tenantId,
              residency: req.body.resource.residency || subject.residency,
              classification:
                req.body.resource.classification || subject.clearance,
              tags: req.body.resource.tags || [],
            };
          } else {
            throw error;
          }
        }
      } else {
        resource = {
          id: req.body?.resource?.id || 'inline',
          tenantId: req.body?.resource?.tenantId || subject.tenantId,
          residency: req.body?.resource?.residency || subject.residency,
          classification:
            req.body?.resource?.classification || subject.clearance,
          tags: req.body?.resource?.tags || [],
        };
      }
      const decision = await authorize({
        subject,
        resource,
        action,
        context: attributeService.getDecisionContext(
          String(req.body?.context?.currentAcr || 'loa1'),
        ),
      });
      res.json({
        allow: decision.allowed,
        reason: decision.reason,
        obligations: decision.obligations,
      });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  app.post(
    '/auth/webauthn/challenge',
    requireAuth(attributeService, {
      action: 'step-up:challenge',
      skipAuthorization: true,
    }),
    (req: AuthenticatedRequest, res) => {
      try {
        const userId = String(req.user?.sub || '');
        const challenge = stepUpManager.createChallenge(userId);
        res.json(challenge);
      } catch (error) {
        res.status(400).json({ error: (error as Error).message });
      }
    },
  );

  app.post(
    '/auth/step-up',
    requireAuth(attributeService, {
      action: 'step-up:verify',
      skipAuthorization: true,
    }),
    async (req: AuthenticatedRequest, res) => {
      try {
        const userId = String(req.user?.sub || '');
        const { credentialId, signature, challenge } = req.body || {};
        if (!credentialId || !signature || !challenge) {
          return res.status(400).json({ error: 'missing_challenge_payload' });
        }
        stepUpManager.verifyResponse(userId, {
          credentialId,
          signature,
          challenge,
        });
        const { SignJWT } = await import('jose');
        const token = await new SignJWT({
          ...req.user,
          acr: 'loa2',
        })
          .setProtectedHeader({ alg: 'RS256', kid: 'authz-gateway-1' })
          .setIssuedAt()
          .setExpirationTime('1h')
          .sign(getPrivateKey());
        res.json({ token });
      } catch (error) {
        res.status(400).json({ error: (error as Error).message });
      }
    },
  );

  const upstream = process.env.UPSTREAM || 'http://localhost:4001';
  app.use(
    '/protected',
    requireAuth(attributeService, {
      action: 'dataset:read',
      resourceIdHeader: 'x-resource-id',
    }),
    createProxyMiddleware({
      target: upstream,
      changeOrigin: true,
      pathRewrite: { '^/protected': '' },
      onProxyReq: (proxyReq) => {
        injectTraceContext(proxyReq);
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

import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { initKeys, getPublicJwk } from './keys';
import { login, introspect, oidcLogin } from './auth';
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
import { sessionManager } from './session';
import { requireServiceAuth } from './service-auth';
import {
  buildAdapterResource,
  getAdapterManifest,
  missingAdapterPermissions,
} from './adapter-capabilities';
import { emitDecisionReceipt } from '../../../packages/prov-ledger/src/receipt';
import type { ProvenanceManifest } from '../../../packages/prov-ledger/src/primitives';

export async function createApp(): Promise<express.Application> {
  await initKeys();
  await startObservability();
  const attributeService = new AttributeService();
  const stepUpManager = new StepUpManager();
  const trustedServices = (process.env.SERVICE_AUTH_CALLERS || 'api-gateway,maestro')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);

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

  app.post('/auth/oidc/callback', async (req, res) => {
    const { idToken } = req.body || {};
    if (!idToken) {
      return res.status(400).json({ error: 'id_token_required' });
    }
    try {
      const token = await oidcLogin(idToken);
      res.json({ token });
    } catch (error) {
      res.status(401).json({ error: (error as Error).message });
    }
  });

  app.post(
    '/auth/introspect',
    requireServiceAuth({
      audience: 'authz-gateway',
      allowedServices: trustedServices,
      requiredScopes: ['auth:introspect'],
    }),
    async (req, res) => {
      try {
        const { token } = req.body;
        const payload = await introspect(token);
        res.json(payload);
      } catch {
        res.status(401).json({ error: 'invalid_token' });
      }
    },
  );

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

  app.post(
    '/authorize',
    requireServiceAuth({
      audience: 'authz-gateway',
      allowedServices: trustedServices,
      requiredScopes: ['abac:decide'],
    }),
    async (req, res) => {
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
    },
  );

  app.post(
    '/adapters/:id/simulate',
    requireServiceAuth({
      audience: 'authz-gateway',
      allowedServices: trustedServices,
      requiredScopes: ['abac:simulate'],
    }),
    async (req, res) => {
      try {
        const adapterId = String(req.params.id || '').trim();
        if (!adapterId) {
          return res.status(400).json({ error: 'adapter_id_required' });
        }
        const adapter = getAdapterManifest(adapterId);
        if (!adapter) {
          return res.status(404).json({ error: 'adapter_not_found' });
        }
        const subjectId = req.body?.subjectId;
        if (!subjectId) {
          return res.status(400).json({ error: 'subject_id_required' });
        }
        const subject = await attributeService.getSubjectAttributes(subjectId);
        const missing = missingAdapterPermissions(subject, adapter);
        if (missing.length > 0) {
          return res
            .status(403)
            .json({ error: 'missing_permissions', missing });
        }

        const resource = buildAdapterResource(
          adapter,
          subject,
          req.body?.resource as Partial<ResourceAttributes> | undefined,
        );
        const retries =
          typeof req.body?.retries === 'number' && req.body.retries >= 0
            ? req.body.retries
            : 0;
        const decision = await authorize({
          subject,
          resource,
          action: req.body?.action || 'adapter:invoke',
          context: {
            ...attributeService.getDecisionContext(
              String(req.body?.context?.currentAcr || 'loa1'),
            ),
            adapterId,
            retries,
          },
        });

        const manifest: ProvenanceManifest = {
          artifactId: `adapter:${adapterId}`,
          steps: [],
        };
        const { receipt } = emitDecisionReceipt({
          manifest,
          adapterId,
          action: req.body?.action || 'adapter:invoke',
          decision: decision.allowed ? 'allow' : 'deny',
          subject,
          resource,
          context: req.body?.context || {},
          retries,
          obligations: decision.obligations,
        });

        res.json({
          allow: decision.allowed,
          reason: decision.reason,
          obligations: decision.obligations,
          adapter: {
            id: adapter.id,
            requiredPermissions: adapter.requiredPermissions,
            claims: adapter.claims,
            capabilities: adapter.capabilities || [],
          },
          receipt,
        });
      } catch (error) {
        res.status(400).json({ error: (error as Error).message });
      }
    },
  );

  app.post(
    '/auth/webauthn/challenge',
    requireAuth(attributeService, {
      action: 'step-up:challenge',
      skipAuthorization: true,
    }),
    (req: AuthenticatedRequest, res) => {
      try {
        const userId = String(req.user?.sub || '');
        const sessionId = String(req.user?.sid || '');
        if (!sessionId) {
          return res.status(400).json({ error: 'session_missing' });
        }
        const challenge = stepUpManager.createChallenge(userId, {
          sessionId,
          requestedAction: 'step-up:challenge',
          resourceId: req.resourceAttributes?.id,
          tenantId: req.subjectAttributes?.tenantId,
          classification: req.resourceAttributes?.classification,
          currentAcr: String(req.user?.acr || 'loa1'),
        });
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
        const sessionId = String(req.user?.sid || '');
        stepUpManager.verifyResponse(
          userId,
          {
            credentialId,
            signature,
            challenge,
          },
          sessionId,
        );
        const sid = String(req.user?.sid || '');
        const token = await sessionManager.elevateSession(sid, {
          acr: 'loa2',
          amr: ['hwk', 'fido2'],
          extendSeconds: 30 * 60,
        });
        res.json({ token, acr: 'loa2', amr: ['hwk', 'fido2'] });
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onProxyReq: (proxyReq: any) => {
        injectTraceContext(proxyReq);
      },
    } as any),
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

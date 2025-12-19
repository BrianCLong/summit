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
import { BreakGlassManager } from './break-glass';
import { log as auditLog } from './audit';
import { lookupApiClient } from './api-keys';
import { RateLimiter } from './rate-limit';
import { QuotaManager } from './quota';
import { emitApiCallEvent } from './events';

export async function createApp(): Promise<express.Application> {
  await initKeys();
  await startObservability();
  const attributeService = new AttributeService();
  const stepUpManager = new StepUpManager();
  const breakGlassManager = new BreakGlassManager();
  const rateLimiter = new RateLimiter({
    limit: Number(process.env.API_RATE_LIMIT || 100),
    windowMs: Number(process.env.API_RATE_WINDOW_MS || 60_000),
  });
  const quotaManager = new QuotaManager({
    limit: Number(process.env.API_QUOTA_LIMIT || 1_000),
    windowMs: Number(process.env.API_QUOTA_WINDOW_MS || 60_000),
  });
  const trustedServices = (
    process.env.SERVICE_AUTH_CALLERS || 'api-gateway,maestro'
  )
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

  app.post('/v1/companyos/decisions:check', async (req, res) => {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || typeof apiKey !== 'string') {
      return res.status(401).json({ error: 'api_key_required' });
    }
    const client = lookupApiClient(apiKey);
    if (!client) {
      return res.status(403).json({ error: 'invalid_api_key' });
    }
    const rate = rateLimiter.check(client.keyId);
    res.setHeader('X-RateLimit-Limit', String(rate.limit));
    res.setHeader('X-RateLimit-Remaining', String(rate.remaining));
    res.setHeader('X-RateLimit-Reset', String(rate.reset));
    if (!rate.allowed) {
      emitApiCallEvent({
        tenantId: client.tenantId,
        clientId: client.clientId,
        subjectId: client.subjectHint,
        apiMethod: 'companyos.decisions.check',
        statusCode: 429,
        decision: 'rate_limited',
        latencyMs: 0,
      });
      return res.status(429).json({ error: 'rate_limit_exceeded' });
    }

    const quota = quotaManager.consume(client.keyId);
    res.setHeader('X-Quota-Limit', String(quota.limit));
    res.setHeader('X-Quota-Remaining', String(quota.remaining));
    res.setHeader('X-Quota-Reset', String(quota.reset));
    if (!quota.allowed) {
      emitApiCallEvent({
        tenantId: client.tenantId,
        clientId: client.clientId,
        subjectId: client.subjectHint,
        apiMethod: 'companyos.decisions.check',
        statusCode: 429,
        decision: 'quota_exhausted',
        latencyMs: 0,
      });
      return res.status(429).json({ error: 'quota_exhausted' });
    }

    const traceId = emitApiCallEvent({
      tenantId: client.tenantId,
      clientId: client.clientId,
      subjectId: client.subjectHint,
      apiMethod: 'companyos.decisions.check',
      statusCode: 200,
      decision: 'allow',
      latencyMs: 1,
    });
    res.json({
      allow: true,
      reason: 'allow',
      obligations: [],
      trace_id: traceId,
    });
  });

  app.post(
    '/admin/break-glass/grant',
    requireServiceAuth({
      audience: 'authz-gateway',
      allowedServices: trustedServices,
      requiredScopes: ['breakglass:manage'],
    }),
    async (req, res) => {
      try {
        const {
          sid,
          reason,
          role,
          requestedBy,
          durationSeconds,
          approvals,
          resourceId,
        } = req.body || {};
        if (!sid || !reason || !role || !requestedBy) {
          return res
            .status(400)
            .json({ error: 'sid_reason_role_requestedBy_required' });
        }
        if (process.env.BREAK_GLASS !== '1') {
          return res.status(403).json({ error: 'break_glass_disabled' });
        }
        const { token, session } = await breakGlassManager.grant({
          sid,
          reason,
          role,
          requestedBy,
          durationSeconds: Number(durationSeconds),
          approvals,
          resourceId,
        });
        res.json({ token, session });
      } catch (error) {
        res.status(400).json({ error: (error as Error).message });
      }
    },
  );

  app.post(
    '/admin/break-glass/revoke',
    requireServiceAuth({
      audience: 'authz-gateway',
      allowedServices: trustedServices,
      requiredScopes: ['breakglass:manage'],
    }),
    (req, res) => {
      const { sid, actor, reason } = req.body || {};
      if (!sid || !actor) {
        return res.status(400).json({ error: 'sid_and_actor_required' });
      }
      breakGlassManager.revoke(sid, actor, reason || 'revoked');
      res.json({ status: 'revoked' });
    },
  );

  app.get(
    '/admin/break-glass/active',
    requireServiceAuth({
      audience: 'authz-gateway',
      allowedServices: trustedServices,
      requiredScopes: ['breakglass:manage'],
    }),
    (_req, res) => {
      if (process.env.BREAK_GLASS !== '1') {
        return res.status(403).json({ error: 'break_glass_disabled' });
      }
      res.json({ sessions: breakGlassManager.listActive() });
    },
  );

  app.get(
    '/break-glass/verify',
    requireAuth(attributeService, {
      action: 'break-glass:verify',
      skipAuthorization: true,
    }),
    (req: AuthenticatedRequest, res) => {
      try {
        if (process.env.BREAK_GLASS !== '1') {
          return res.status(404).json({ error: 'not_found' });
        }
        const sid = String(req.user?.sid || '');
        const session = breakGlassManager.requireActive(sid);
        auditLog({
          subject: String(req.user?.sub || ''),
          tenantId: session.tenantId,
          action: 'break_glass_use',
          resource: session.role,
          allowed: true,
          reason: session.reason,
          details: {
            approvals: session.approvals ?? [],
            expiresAt: session.expiresAt,
          },
        });
        res.json({ status: 'ok', session });
      } catch (error) {
        res.status(401).json({ error: (error as Error).message });
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
    '/auth/webauthn/challenge',
    requireAuth(attributeService, {
      action: 'step-up:challenge',
      skipAuthorization: true,
    }),
    (req: AuthenticatedRequest, res) => {
      try {
        const userId = String(req.user?.sub || '');
        const sid = String(req.user?.sid || '');
        const requestedAction =
          (req.body?.action as string) || req.headers['x-action'];
        const resourceId =
          (req.body?.resourceId as string) ||
          (req.headers['x-resource-id'] as string);
        const classification =
          (req.body?.classification as string) ||
          (req.headers['x-resource-classification'] as string) ||
          req.subjectAttributes?.clearance;
        const tenantId =
          (req.body?.tenantId as string) ||
          (req.headers['x-tenant-id'] as string) ||
          req.subjectAttributes?.tenantId;
        const challenge = stepUpManager.createChallenge(userId, {
          sessionId: sid,
          requestedAction: requestedAction
            ? String(requestedAction)
            : 'step-up',
          resourceId: resourceId ? String(resourceId) : undefined,
          classification: classification ? String(classification) : undefined,
          tenantId: tenantId ? String(tenantId) : undefined,
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
        const sid = String(req.user?.sid || '');
        const grant = stepUpManager.verifyResponse(
          userId,
          {
            credentialId,
            signature,
            challenge,
          },
          sid,
        );
        const token = await sessionManager.elevateSession(sid, {
          acr: 'loa2',
          amr: ['hwk', 'fido2'],
          extendSeconds: 30 * 60,
          claims: { elevation: grant },
        });
        res.json({
          token,
          acr: 'loa2',
          amr: ['hwk', 'fido2'],
          elevation: grant,
        });
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
      onProxyReq: (proxyReq: import('http').ClientRequest) => {
        injectTraceContext(proxyReq);
      },
    } as unknown as Parameters<typeof createProxyMiddleware>[0]),
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

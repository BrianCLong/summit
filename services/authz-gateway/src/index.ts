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
} from './observability';
import { AttributeService } from './attribute-service';
import { StepUpManager } from './stepup';
import { authorize } from './policy';
import { lookupApiClient } from './api-keys';
import { RateLimiter } from './rate-limit';
import { QuotaManager } from './quota';
import { emitApiCallEvent, createTraceId } from './events';
import type { AuthenticatedRequest } from './middleware';
import type { ResourceAttributes, SubjectAttributes } from './types';

async function resolveResourceFromBody(
  attributeService: AttributeService,
  subject: SubjectAttributes,
  body?: Partial<ResourceAttributes>,
): Promise<ResourceAttributes> {
  if (body?.id) {
    try {
      const fromCatalog = await attributeService.getResourceAttributes(body.id);
      return {
        ...fromCatalog,
        ...body,
      };
    } catch (error) {
      if (body.tenantId) {
        return {
          id: body.id,
          tenantId: body.tenantId,
          residency: body.residency || subject.residency,
          classification: body.classification || subject.clearance,
          tags: body.tags || [],
        };
      }
      throw error;
    }
  }

  return {
    id: body?.id || 'inline',
    tenantId: body?.tenantId || subject.tenantId,
    residency: body?.residency || subject.residency,
    classification: body?.classification || subject.clearance,
    tags: body?.tags || [],
  };
}

export async function createApp(): Promise<express.Application> {
  await initKeys();
  await startObservability();
  const attributeService = new AttributeService();
  const stepUpManager = new StepUpManager();
  const rateLimiter = new RateLimiter({
    limit: Number(process.env.API_RATE_LIMIT || 60),
    windowMs: Number(process.env.API_RATE_WINDOW_MS || 60_000),
  });
  const quotaManager = new QuotaManager({
    limit: Number(process.env.API_QUOTA_LIMIT || 10_000),
    windowMs: Number(process.env.API_QUOTA_WINDOW_MS || 2_592_000_000),
  });

  const app: express.Application = express();
  app.use(pinoHttp());
  app.use(express.json());
  app.use(requestMetricsMiddleware);

  app.get('/metrics', metricsHandler);

  app.post('/v1/companyos/decisions:check', async (req, res) => {
    const traceId = createTraceId();
    const started = Date.now();
    const apiKey = req.header('x-api-key');
    if (!apiKey) {
      res.status(401).json({ error: 'missing_api_key', trace_id: traceId });
      emitApiCallEvent({
        tenantId: 'unknown',
        clientId: 'unknown',
        subjectId: req.body?.subject?.id,
        apiMethod: 'companyos.decisions.check',
        statusCode: 401,
        decision: 'error',
        latencyMs: Date.now() - started,
        traceId,
        error: 'missing_api_key',
      });
      return;
    }

    const client = lookupApiClient(apiKey);
    if (!client) {
      res.status(401).json({ error: 'invalid_api_key', trace_id: traceId });
      emitApiCallEvent({
        tenantId: 'unknown',
        clientId: 'unknown',
        subjectId: req.body?.subject?.id,
        apiMethod: 'companyos.decisions.check',
        statusCode: 401,
        decision: 'error',
        latencyMs: Date.now() - started,
        traceId,
        error: 'invalid_api_key',
      });
      return;
    }

    const rateStatus = rateLimiter.check(client.keyId);
    res.set({
      'X-RateLimit-Limit': String(rateStatus.limit),
      'X-RateLimit-Remaining': String(Math.max(rateStatus.remaining, 0)),
      'X-RateLimit-Reset': String(Math.floor(rateStatus.reset / 1000)),
    });
    if (!rateStatus.allowed) {
      res.status(429).json({ error: 'rate_limit_exceeded', trace_id: traceId });
      emitApiCallEvent({
        tenantId: client.tenantId,
        clientId: client.clientId,
        subjectId: req.body?.subject?.id,
        apiMethod: 'companyos.decisions.check',
        statusCode: 429,
        decision: 'throttled',
        latencyMs: Date.now() - started,
        traceId,
        error: 'rate_limit_exceeded',
      });
      return;
    }

    const quotaStatus = quotaManager.consume(client.keyId);
    res.set({
      'X-Quota-Limit': String(quotaStatus.limit),
      'X-Quota-Remaining': String(Math.max(quotaStatus.remaining, 0)),
      'X-Quota-Reset': String(Math.floor(quotaStatus.reset / 1000)),
    });
    if (!quotaStatus.allowed) {
      res.status(429).json({ error: 'quota_exhausted', trace_id: traceId });
      emitApiCallEvent({
        tenantId: client.tenantId,
        clientId: client.clientId,
        subjectId: req.body?.subject?.id,
        apiMethod: 'companyos.decisions.check',
        statusCode: 429,
        decision: 'quota_exhausted',
        latencyMs: Date.now() - started,
        traceId,
        error: 'quota_exhausted',
      });
      return;
    }

    const subjectId = req.body?.subject?.id || client.subjectHint;
    const action = req.body?.action;
    if (!subjectId || !action) {
      res.status(400).json({ error: 'subject_id_and_action_required', trace_id: traceId });
      emitApiCallEvent({
        tenantId: client.tenantId,
        clientId: client.clientId,
        subjectId,
        apiMethod: 'companyos.decisions.check',
        statusCode: 400,
        decision: 'error',
        latencyMs: Date.now() - started,
        traceId,
        error: 'subject_id_and_action_required',
      });
      return;
    }

    try {
      const subject = await attributeService.getSubjectAttributes(subjectId);
      if (subject.tenantId !== client.tenantId) {
        res.status(403).json({ error: 'tenant_mismatch', trace_id: traceId });
        emitApiCallEvent({
          tenantId: client.tenantId,
          clientId: client.clientId,
          subjectId,
          apiMethod: 'companyos.decisions.check',
          statusCode: 403,
          decision: 'error',
          latencyMs: Date.now() - started,
          traceId,
          error: 'tenant_mismatch',
        });
        return;
      }

      const resource = await resolveResourceFromBody(
        attributeService,
        subject,
        req.body?.resource,
      );
      const decision = await authorize({
        subject,
        resource,
        action,
        context: attributeService.getDecisionContext(
          String(req.body?.context?.currentAcr || 'loa1'),
        ),
      });
      const latencyMs = Date.now() - started;
      emitApiCallEvent({
        tenantId: client.tenantId,
        clientId: client.clientId,
        subjectId,
        apiMethod: 'companyos.decisions.check',
        statusCode: 200,
        decision: decision.allowed ? 'allow' : 'deny',
        latencyMs,
        traceId,
      });
      res.json({
        allow: decision.allowed,
        reason: decision.reason,
        obligations: decision.obligations,
        trace_id: traceId,
      });
    } catch (error) {
      const latencyMs = Date.now() - started;
      emitApiCallEvent({
        tenantId: client.tenantId,
        clientId: client.clientId,
        subjectId,
        apiMethod: 'companyos.decisions.check',
        statusCode: 400,
        decision: 'error',
        latencyMs,
        traceId,
        error: (error as Error).message,
      });
      res.status(400).json({ error: (error as Error).message, trace_id: traceId });
    }
  });

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
      const resource = await resolveResourceFromBody(
        attributeService,
        subject,
        req.body?.resource,
      );
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

import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import pino from 'pino';
import pinoHttp from 'pino-http';
import type { ClientRequest } from 'http';
import { initKeys, getPublicJwk } from './keys';
import { login, introspect, oidcLogin } from './auth';
import { requireAuth } from './middleware';
import { lookupApiClient, type ApiClient } from './api-keys';
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
import { log } from './audit';
import type { AuthenticatedRequest } from './middleware';
import type { ResourceAttributes, SubjectAttributes } from './types';
import { sessionManager } from './session';
import { requireServiceAuth } from './service-auth';
import { emitApiCallEvent } from './events';
import { RateLimiter, type RateLimitStatus } from './rate-limit';
import { QuotaManager, type QuotaStatus } from './quota';

function parsePositiveInt(value?: string, fallback?: number): number | null {
  if (value === undefined || value === null) return fallback ?? null;
  const asNumber = Number(value);
  if (!Number.isFinite(asNumber) || asNumber <= 0) {
    return fallback ?? null;
  }
  return asNumber;
}

async function resolveResourceAttributes(
  attributeService: AttributeService,
  subject: SubjectAttributes,
  resourceInput?: Partial<ResourceAttributes>,
): Promise<ResourceAttributes> {
  if (resourceInput?.id) {
    try {
      const fromCatalog = await attributeService.getResourceAttributes(
        resourceInput.id,
      );
      return {
        ...fromCatalog,
        ...resourceInput,
        tags: resourceInput.tags ?? fromCatalog.tags,
      };
    } catch (error) {
      if (resourceInput.tenantId) {
        return {
          id: resourceInput.id,
          tenantId: resourceInput.tenantId,
          residency: resourceInput.residency || subject.residency,
          classification: resourceInput.classification || subject.clearance,
          tags: resourceInput.tags || [],
        };
      }
      throw error;
    }
  }

  return {
    id: resourceInput?.id || 'inline',
    tenantId: resourceInput?.tenantId || subject.tenantId,
    residency: resourceInput?.residency || subject.residency,
    classification: resourceInput?.classification || subject.clearance,
    tags: resourceInput?.tags || [],
  };
}

function applyGovernanceHeaders(
  res: express.Response,
  rateStatus?: RateLimitStatus | null,
  quotaStatus?: QuotaStatus | null,
) {
  if (rateStatus) {
    res.setHeader('X-RateLimit-Limit', String(rateStatus.limit));
    res.setHeader('X-RateLimit-Remaining', String(rateStatus.remaining));
    res.setHeader('X-RateLimit-Reset', String(rateStatus.reset));
  }

  if (quotaStatus) {
    res.setHeader('X-Quota-Limit', String(quotaStatus.limit));
    res.setHeader('X-Quota-Remaining', String(quotaStatus.remaining));
    res.setHeader('X-Quota-Reset', String(quotaStatus.reset));
  }
}

function createRateLimiter(): RateLimiter | null {
  const limit = parsePositiveInt(process.env.API_RATE_LIMIT ?? undefined);
  if (!limit) return null;
  const windowMs = parsePositiveInt(process.env.API_RATE_WINDOW_MS, 60_000);
  return new RateLimiter({ limit, windowMs: windowMs ?? 60_000 });
}

function createQuotaManager(): QuotaManager | null {
  const limit = parsePositiveInt(process.env.API_QUOTA_LIMIT ?? undefined);
  if (!limit) return null;
  const windowMs = parsePositiveInt(process.env.API_QUOTA_WINDOW_MS, 60_000);
  return new QuotaManager({ limit, windowMs: windowMs ?? 60_000 });
}

function sanitizeHeaderValue(value?: string | string[]): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return typeof value === 'string' ? value : undefined;
}

export async function createApp(): Promise<express.Application> {
  await initKeys();
  await startObservability();
  const attributeService = new AttributeService();
  const stepUpManager = new StepUpManager();
  const trustedServices = (
    process.env.SERVICE_AUTH_CALLERS || 'api-gateway,maestro'
  )
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
  const rateLimiter = createRateLimiter();
  const quotaManager = createQuotaManager();

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
        const resource = await resolveResourceAttributes(
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
    },
  );

  app.post('/v1/companyos/decisions:check', async (req, res) => {
    const start = Date.now();
    const apiMethod = 'companyos.decisions.check';
    const apiKey = sanitizeHeaderValue(req.headers['x-api-key']);
    const subjectId = req.body?.subject?.id as string | undefined;
    const action = req.body?.action as string | undefined;

    const sendResponse = async ({
      statusCode,
      body,
      client,
      subject,
      resource,
      decisionReason,
      decisionAllowed,
      obligations,
      error,
    }: {
      statusCode: number;
      body: Record<string, unknown>;
      client?: ApiClient | null;
      subject?: SubjectAttributes;
      resource?: ResourceAttributes;
      decisionReason?: string;
      decisionAllowed?: boolean;
      obligations?: unknown;
      error?: string;
    }) => {
      const traceId = emitApiCallEvent({
        tenantId: client?.tenantId || 'unknown',
        clientId: client?.clientId || 'unknown',
        subjectId: subject?.id || subjectId,
        apiMethod,
        statusCode,
        decision: decisionReason,
        latencyMs: Date.now() - start,
        error,
      });

      if (client) {
        log({
          subject: subject?.id || subjectId || 'unknown',
          action: action || 'unknown',
          resource: resource?.id || req.body?.resource?.id || 'unknown',
          tenantId: subject?.tenantId || client.tenantId,
          allowed: decisionAllowed ?? false,
          reason: decisionReason || error || 'unknown',
          obligations: Array.isArray(obligations) ? obligations : undefined,
          resourceAttributes: resource,
          traceId,
          clientId: client.clientId,
          apiMethod,
          context: {
            statusCode,
          },
        });
      }

      return res.status(statusCode).json({ ...body, trace_id: traceId });
    };

    if (!apiKey) {
      return sendResponse({
        statusCode: 401,
        body: { error: 'missing_api_key' },
        decisionReason: 'missing_api_key',
        decisionAllowed: false,
      });
    }

    const client = lookupApiClient(apiKey);
    if (!client) {
      return sendResponse({
        statusCode: 401,
        body: { error: 'invalid_api_key' },
        decisionReason: 'invalid_api_key',
        decisionAllowed: false,
      });
    }

    const rateStatus = rateLimiter?.check(client.keyId);
    const quotaStatus = quotaManager?.consume(client.keyId);
    applyGovernanceHeaders(res, rateStatus, quotaStatus);

    if (rateStatus && !rateStatus.allowed) {
      return sendResponse({
        statusCode: 429,
        body: { error: 'rate_limit_exceeded' },
        client,
        decisionReason: 'rate_limit_exceeded',
        decisionAllowed: false,
      });
    }

    if (quotaStatus && !quotaStatus.allowed) {
      return sendResponse({
        statusCode: 429,
        body: { error: 'quota_exhausted' },
        client,
        decisionReason: 'quota_exhausted',
        decisionAllowed: false,
      });
    }

    if (!subjectId || !action) {
      return sendResponse({
        statusCode: 400,
        body: { error: 'subject_id_and_action_required' },
        client,
        decisionReason: 'validation_failed',
        decisionAllowed: false,
      });
    }

    try {
      const subject = await attributeService.getSubjectAttributes(subjectId);
      const resource = await resolveResourceAttributes(
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
      return sendResponse({
        statusCode: 200,
        body: {
          allow: decision.allowed,
          reason: decision.reason,
          obligations: decision.obligations,
        },
        client,
        subject,
        resource,
        decisionReason: decision.reason,
        decisionAllowed: decision.allowed,
        obligations: decision.obligations,
      });
    } catch (error) {
      return sendResponse({
        statusCode: 400,
        body: { error: (error as Error).message },
        client,
        decisionReason: (error as Error).message,
        decisionAllowed: false,
        error: (error as Error).message,
      });
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
        const sessionId = String(req.user?.sid || 'session-unknown');
        const challenge = stepUpManager.createChallenge(userId, {
          sessionId,
          requestedAction: String(req.body?.action || 'dataset:read'),
          resourceId:
            sanitizeHeaderValue(req.headers['x-resource-id']) ||
            (typeof req.body?.resourceId === 'string'
              ? req.body.resourceId
              : undefined),
          classification:
            (req.body?.classification as string | undefined) ||
            req.subjectAttributes?.clearance,
          tenantId: req.subjectAttributes?.tenantId || 'unknown',
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
        const sid = String(req.user?.sid || '');
        if (!credentialId || !signature || !challenge) {
          return res.status(400).json({ error: 'missing_challenge_payload' });
        }
        stepUpManager.verifyResponse(
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
      on: {
        proxyReq: (proxyReq: ClientRequest) => {
          injectTraceContext(proxyReq);
        },
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

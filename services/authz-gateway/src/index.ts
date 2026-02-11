import express from 'express';
import type { ClientRequest } from 'http';
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
import { breakGlassManager } from './break-glass';
import { sloMiddleware, sloTracker, buildSloEvidence } from './slo';
import { generateIncidentEvidence } from './incidents';
import { buildStandardHooks, buildPolicyBundle } from './standards';
import { AbacLocalEvaluator } from './abac-local-evaluator';
import { log } from './audit';

export async function createApp(): Promise<express.Application> {
  await initKeys();
  await startObservability();
  const attributeService = new AttributeService();
  const stepUpManager = new StepUpManager();
  const abacEvaluator = new AbacLocalEvaluator();
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
  app.use(sloMiddleware);

  app.get('/metrics', metricsHandler);

  app.get(
    '/slo/:tenantId',
    requireServiceAuth({
      audience: 'authz-gateway',
      allowedServices: trustedServices,
      requiredScopes: ['slo:read'],
    }),
    (req, res) => {
      const tenantId = String(req.params.tenantId || 'fleet');
      const route = (req.query.route as string) || 'fleet';
      const snapshot = sloTracker.snapshot(tenantId, route as any);
      res.json(snapshot);
    },
  );

  app.post(
    '/incidents/evidence',
    requireServiceAuth({
      audience: 'authz-gateway',
      allowedServices: trustedServices,
      requiredScopes: ['incident:evidence'],
    }),
    async (req, res) => {
      const evidence = await generateIncidentEvidence(req);
      res.json(evidence);
    },
  );

  app.get(
    '/standards/hooks',
    requireServiceAuth({
      audience: 'authz-gateway',
      allowedServices: trustedServices,
      requiredScopes: ['standards:read'],
    }),
    (_req, res) => {
      res.json(buildStandardHooks());
    },
  );

  app.get(
    '/policy/bundle',
    requireServiceAuth({
      audience: 'authz-gateway',
      allowedServices: trustedServices,
      requiredScopes: ['policy:export'],
    }),
    (_req, res) => {
      res.json(buildPolicyBundle());
    },
  );

  app.post('/abac/demo/enforce', async (req, res) => {
    try {
      const subjectId = String(req.body?.subjectId || '');
      const action = String(req.body?.action || '').trim();
      if (!subjectId || !action) {
        return res.status(400).json({ error: 'subject_and_action_required' });
      }
      const subject = await attributeService.getSubjectAttributes(subjectId);
      const resource: ResourceAttributes = {
        id: String(req.body?.resource?.id || 'inline'),
        tenantId: req.body?.resource?.tenantId || subject.tenantId,
        residency: req.body?.resource?.residency || subject.residency,
        classification: req.body?.resource?.classification || subject.clearance,
        owner: req.body?.resource?.owner || subject.org,
        customer_id: req.body?.resource?.customer_id,
        tags: req.body?.resource?.tags || [],
      };
      const input = {
        subject,
        resource,
        action,
        context: attributeService.getDecisionContext(
          String(req.body?.context?.currentAcr || subject.loa || 'loa1'),
        ),
      };
      const evaluation = abacEvaluator.evaluate(input);
      await log({
        subject: subject.id,
        action,
        resource: JSON.stringify(resource),
        tenantId: subject.tenantId,
        allowed: evaluation.decision.allowed,
        reason: evaluation.decision.reason,
        decisionId: evaluation.decision.decisionId,
        policyVersion: evaluation.decision.policyVersion,
        inputsHash: evaluation.decision.inputsHash,
      });
      const status = evaluation.decision.allowed ? 200 : 403;
      res.status(status).json({
        policyVersion: evaluation.version,
        ...evaluation.decision,
      });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
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
    '/access/break-glass/request',
    requireAuth(attributeService, {
      action: 'break-glass:request',
    }),
    (req: AuthenticatedRequest, res) => {
      const justification = String(req.body?.justification || '').trim();
      const ticketId = String(req.body?.ticketId || '').trim();
      if (!justification || !ticketId) {
        return res
          .status(400)
          .json({ error: 'justification_and_ticket_required' });
      }
      const scope = Array.isArray(req.body?.scope)
        ? req.body.scope.map(String).filter(Boolean)
        : ['break_glass:elevated'];
      try {
        const record = breakGlassManager.createRequest(
          String(req.user?.sub || ''),
          justification,
          ticketId,
          scope,
        );
        return res.status(201).json({
          requestId: record.id,
          status: record.status,
          scope: record.scope,
        });
      } catch (error) {
        return res.status(400).json({ error: (error as Error).message });
      }
    },
  );

  app.post(
    '/access/break-glass/approve',
    requireAuth(attributeService, {
      action: 'break-glass:approve',
      requiredAcr: 'loa2',
    }),
    async (req: AuthenticatedRequest, res) => {
      const requestId = String(req.body?.requestId || '').trim();
      if (!requestId) {
        return res.status(400).json({ error: 'request_id_required' });
      }
      try {
        const approval = await breakGlassManager.approve(
          requestId,
          String(req.user?.sub || ''),
        );
        return res.json(approval);
      } catch (error) {
        const message = (error as Error).message;
        if (message === 'request_not_found') {
          return res.status(404).json({ error: message });
        }
        if (message === 'request_already_approved') {
          return res.status(409).json({ error: message });
        }
        if (message === 'request_expired') {
          return res.status(410).json({ error: message });
        }
        return res.status(400).json({ error: message });
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
        const challenge = stepUpManager.createChallenge(userId, {
          sessionId,
          requestedAction: String(req.body?.action || 'step-up:challenge'),
          resourceId: req.body?.resourceId,
          classification: req.body?.classification,
          tenantId: req.subjectAttributes?.tenantId,
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
        stepUpManager.verifyResponse(
          userId,
          {
            credentialId,
            signature,
            challenge,
          },
          String(req.user?.sid || ''),
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
      onProxyReq: (proxyReq: ClientRequest) => {
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

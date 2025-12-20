import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { postgresPool } from '../../db/postgres.js';
import { authMiddleware, requirePermission } from '../../middleware/auth.js';
import { logger } from '../../utils/logger.js';

interface PreflightRequestBody {
  action: string;
  resource?: {
    id?: string;
    tenantId?: string;
    classification?: string;
    residency?: string;
    tags?: string[];
  };
  context?: {
    purpose?: string;
    environment?: string;
    acr?: string;
  };
}

interface Obligation {
  type: string;
  target?: string;
  fields?: string[];
  [key: string]: unknown;
}

interface PreflightDecision {
  allow: boolean;
  reason: string;
  obligations: Obligation[];
  redactions: string[];
  decisionId?: string;
}

function getAuthzUrl(): string {
  return (process.env.AUTHZ_GATEWAY_URL || 'http://localhost:4000')
    .replace(/\/$/, '')
    .concat('/authorize');
}

function buildServiceToken(scopes: string[]): string {
  const secret =
    process.env.SERVICE_AUTH_SHARED_SECRET || 'dev-service-shared-secret';
  const audience = process.env.SERVICE_AUTH_AUDIENCE || 'authz-gateway';
  const issuer = process.env.SERVICE_AUTH_ISSUER || 'summit-service-issuer';
  const serviceId = process.env.SERVICE_AUTH_SERVICE_ID || 'api';
  const keyId = process.env.SERVICE_AUTH_KEY_ID || 'v1-dev';

  return jwt.sign(
    { scp: scopes },
    secret,
    {
      algorithm: 'HS256',
      audience,
      issuer,
      subject: serviceId,
      keyid: keyId,
      expiresIn: 5 * 60,
    } as jwt.SignOptions,
  );
}

export function mapRedactions(obligations: Obligation[]): string[] {
  const out = new Set<string>();
  for (const obl of obligations) {
    if (obl.type === 'redact' && typeof obl.target === 'string') {
      out.add(obl.target);
    }
    if (
      obl.type === 'redact_fields' &&
      Array.isArray(obl.fields) &&
      obl.fields.length > 0
    ) {
      for (const f of obl.fields) {
        if (typeof f === 'string') out.add(f);
      }
    }
  }
  return Array.from(out);
}

async function simulateWithGateway(
  body: PreflightRequestBody,
  user: any,
): Promise<PreflightDecision> {
  const token = buildServiceToken(['abac:decide']);
  const url = getAuthzUrl();
  const payload = {
    subject: {
      id: user?.id,
      tenantId: user?.tenantId,
      roles: user?.role ? [user.role] : [],
      entitlements: Array.isArray(user?.permissions) ? user.permissions : [],
      residency: user?.residency || user?.tenantId || 'unknown',
      clearance: user?.role || 'analyst',
      loa: body.context?.acr || 'loa1',
      riskScore: 0,
      groups: [],
      metadata: {},
    },
    resource: {
      id: body.resource?.id || 'inline',
      tenantId: body.resource?.tenantId || user?.tenantId,
      classification: body.resource?.classification || 'public',
      residency: body.resource?.residency || user?.residency || 'unknown',
      tags: body.resource?.tags || [],
    },
    action: body.action,
    context: {
      requestTime: new Date().toISOString(),
      currentAcr: body.context?.acr || 'loa1',
      purpose: body.context?.purpose,
      environment: body.context?.environment,
    },
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-service-token': token,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      return {
        allow: false,
        reason: `gateway_error_${res.status}`,
        obligations: [],
        redactions: [],
      };
    }

    const data = await res.json();
    const obligations: Obligation[] = Array.isArray(data?.obligations)
      ? data.obligations
      : [];
    const allow = Boolean(data?.allow);
    const reason =
      typeof data?.reason === 'string'
        ? data.reason
        : allow
          ? 'allow'
          : 'deny';

    return {
      allow,
      reason,
      obligations,
      redactions: mapRedactions(obligations),
    };
  } catch (error) {
    logger.warn(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      'authz_gateway_simulation_failed',
    );
    return {
      allow: false,
      reason: 'gateway_unreachable',
      obligations: [],
      redactions: [],
    };
  }
}

async function persistDecision(
  decision: PreflightDecision,
  body: PreflightRequestBody,
  user: any,
): Promise<string> {
  const id = randomUUID();
  try {
    await postgresPool.insert('policy_decisions', {
      id,
      subject_id: user?.id,
      tenant_id: user?.tenantId,
      action: body.action,
      resource_id: body.resource?.id || null,
      allowed: decision.allow,
      reason: decision.reason,
      obligations: JSON.stringify(decision.obligations || []),
      redactions: JSON.stringify(decision.redactions || []),
      created_at: new Date(),
    });
  } catch (error) {
    logger.warn(
      {
        error: error instanceof Error ? error.message : String(error),
        decision_id: id,
      },
      'failed_to_persist_policy_decision',
    );
  }
  return id;
}

export function createActionsPreflightRouter() {
  const router = Router();

  router.post(
    '/preflight',
    authMiddleware,
    requirePermission('entity:read'),
    async (req, res) => {
      const body = req.body as PreflightRequestBody;
      if (!body?.action) {
        return res
          .status(400)
          .json({ ok: false, error: 'action_required', decision: null });
      }
      const user = (req as any).user;
      const decision = await simulateWithGateway(body, user);
      const decisionId = await persistDecision(decision, body, user);

      const response: PreflightDecision = {
        ...decision,
        decisionId,
      };

      return res.json({ ok: true, decision: response });
    },
  );

  return router;
}

export const actionsPreflightRouter = createActionsPreflightRouter();

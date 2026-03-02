import type { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import { randomUUID } from 'crypto';

export interface PolicyOptions {
  dryRun?: boolean;
}

export interface PolicyDenial {
  error: string;
  reason: string;
  appealPath: string;
  traceId?: string;
}

interface AuthzInput {
  subject: {
    id: string;
    roles: string[];
    tenant?: string;
    clearance: string;
  };
  resource: {
    type: string;
    id: string;
    tenant: string;
    classification: string;
  };
  action: string;
  context: {
    env: string;
    request_ip: string;
    time: string;
    reason?: string;
  };
}

interface OPAResult {
  allow: boolean;
  deny?: string[];
}

const DEFAULT_DECISION_URL =
  process.env.OPA_DECISION_URL ||
  'http://opa:8181/v1/data/policy/authz/abac/decision';

function buildAuthzInput(req: Request): AuthzInput {
  const roles = (req.headers['x-roles'] as string | undefined)?.split(',') || [];
  const tenant = (req.headers['x-tenant-id'] as string | undefined) || 'unknown';

  return {
    subject: {
      id: (req.headers['x-subject-id'] as string | undefined) || 'anonymous',
      roles,
      tenant,
      clearance: (req.headers['x-clearance'] as string | undefined) || 'internal',
    },
    resource: {
      type: req.headers['x-resource-type']?.toString() || 'graphql',
      id: req.headers['x-resource-id']?.toString() || 'na',
      tenant,
      classification: (req.headers['x-resource-classification'] as string | undefined) || 'internal',
    },
    action: (req.headers['x-action'] as string | undefined) || `graphql:${req.method.toLowerCase()}`,
    context: {
      env: process.env.NODE_ENV || 'dev',
      request_ip: req.ip || 'unknown',
      time: new Date().toISOString(),
      reason: (req.headers['x-reason-for-access'] as string | undefined) || (req.headers['x-reason'] as string | undefined),
    },
  };
}

/**
 * Enforces OPA-backed policy authorization.
 * In dry-run mode, logs warnings instead of blocking.
 */
export function policyGuard({ dryRun = process.env.POLICY_DRY_RUN === 'true' }: PolicyOptions = {}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.path === '/healthz' || req.path === '/.well-known/apollo/server-health') {
      return next();
    }

    const traceId = (req.headers['x-trace-id'] as string | undefined) || randomUUID();
    const input = buildAuthzInput(req);

    try {
      const opaResponse = await fetch(DEFAULT_DECISION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input }),
      });

      if (!opaResponse.ok) {
        logger.error('OPA decision request failed', {
          status: opaResponse.status,
          traceId,
        });
        if (dryRun) return next();
        return res.status(503).json({ error: 'Authorization service unavailable', traceId });
      }

      const body = (await opaResponse.json()) as { result?: OPAResult };
      const result = body.result;

      if (!result) {
        logger.error('OPA returned empty result', { traceId });
        if (dryRun) return next();
        return res.status(503).json({ error: 'Authorization error', traceId });
      }

      if (!result.allow) {
        const denial: PolicyDenial = {
          error: 'Policy denial',
          reason: result.deny?.join(', ') || 'Access policy violation',
          appealPath: '/ombudsman/appeals',
          traceId,
        };

        logger.warn('Policy violation detected', {
          traceId,
          input: {
            subject: input.subject.id,
            action: input.action,
            tenant: input.resource.tenant,
          },
          denial,
        });

        if (dryRun) {
          logger.warn('Policy dry-run: would have blocked request', { traceId, denial });
          return next();
        }

        return res.status(403).json(denial);
      }

      // Access granted
      (req as any).policyContext = {
        traceId,
        input,
        allowed: true,
      };

      next();
    } catch (error: any) {
      logger.error('Policy enforcement exception', {
        error: error.message,
        traceId,
      });

      if (dryRun) return next();
      return res.status(500).json({ error: 'Internal policy enforcement error', traceId });
    }
  };
}

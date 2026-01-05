import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { AppendOnlyAuditStore } from '../audit/appendOnlyAuditStore.js';
import { opaPolicyEngine } from '../conductor/governance/opa-integration.js';

export interface SensitiveContext {
  purpose: string;
  justification: string;
  caseId: string;
  correlationId: string;
}

export interface SensitiveContextOptions {
  /** Optional override for OPA evaluation */
  opaClient?: typeof opaPolicyEngine;
  /** Optional audit store override for tests */
  auditStore?: AppendOnlyAuditStore;
  /** Optional prefix routes that should trigger the guard */
  routes?: string[];
  /** Friendly action name for audit entries */
  action?: string;
}

const DEFAULT_ROUTES = [
  '/api/security/pii',
  '/api/exports',
  '/api/analytics/export',
  '/api/intel-graph',
];

const defaultAuditStore = new AppendOnlyAuditStore();

function extractContext(req: Request): SensitiveContext | null {
  const purpose =
    (req.headers['x-purpose'] as string) ||
    (req.body?.purpose as string) ||
    '';
  const justification =
    (req.headers['x-justification'] as string) ||
    (req.body?.justification as string) ||
    '';
  const caseId =
    (req.headers['x-case-id'] as string) ||
    (req.body?.case_id as string) ||
    (req.body?.caseId as string) ||
    '';

  const correlationId =
    (req as any).correlationId ||
    (req.headers['x-correlation-id'] as string) ||
    randomUUID();

  if (!purpose || !justification || !caseId) {
    return null;
  }

  return {
    purpose: purpose.trim(),
    justification: justification.trim(),
    caseId: caseId.toString().trim(),
    correlationId,
  };
}

function shouldApplyGuard(req: Request, routes: string[]): boolean {
  const path = `${req.baseUrl || ''}${req.path}`;
  return routes.some((prefix) => path.startsWith(prefix));
}

async function recordAudit(
  auditStore: AppendOnlyAuditStore,
  req: Request,
  context: SensitiveContext | null,
  decision: 'allow' | 'deny',
  reason: string,
  action: string,
) {
  const tenantId =
    (req as any).tenantId ||
    (req as any).tenant_id ||
    (req as any).user?.tenantId ||
    (req.headers['x-tenant-id'] as string) ||
    'unknown';
  const userId = (req as any).user?.id || (req as any).user?.sub;
  const now = new Date().toISOString();

  await auditStore.append({
    version: 'audit_event_v1',
    actor: {
      type: 'user',
      id: userId,
      ip_address: req.ip,
      name: (req as any).user?.email,
    },
    action,
    resource: {
      type: req.method,
      name: req.path,
      id: (req.params as any)?.id,
      owner: tenantId,
    },
    classification: 'restricted',
    policy_version: process.env.OPA_POLICY_VERSION || '1.0',
    decision_id: context?.correlationId || randomUUID(),
    trace_id: (req as any).traceId || context?.correlationId || randomUUID(),
    timestamp: now,
    customer: tenantId,
    metadata: {
      purpose: context?.purpose,
      justification: context?.justification,
      case_id: context?.caseId,
      decision,
      reason,
      correlation_id: context?.correlationId,
      tenantId,
      userId,
    },
  });
}

export function createSensitiveContextMiddleware(
  options: SensitiveContextOptions = {},
) {
  const routes = options.routes ?? DEFAULT_ROUTES;
  const auditStore = options.auditStore ?? defaultAuditStore;
  const opaClient = options.opaClient ?? opaPolicyEngine;
  const action = options.action ?? 'sensitive_action';

  return async function sensitiveContextMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    if (!shouldApplyGuard(req, routes)) {
      return next();
    }

    const context = extractContext(req);

    if (!context) {
      await recordAudit(auditStore, req, null, 'deny', 'context_missing', action);
      return res.status(400).json({
        code: 'SENSITIVE_CONTEXT_REQUIRED',
        message:
          'Purpose, justification, and case_id are required for sensitive operations.',
        required: ['purpose', 'justification', 'case_id'],
        guidance:
          'Provide a specific case identifier, the operational purpose, and a justification before retrying.',
      });
    }

    try {
      const decisionInput = {
        tenantId:
          (req as any).tenantId ||
          (req as any).tenant_id ||
          (req as any).user?.tenantId ||
          (req.headers['x-tenant-id'] as string) ||
          'unknown',
        userId: (req as any).user?.id || (req as any).user?.sub,
        role: (req as any).user?.role || 'user',
        action: req.method.toLowerCase(),
        resource: req.path,
        resourceAttributes: {
          ...req.body,
          ...req.params,
        },
        context: {
          purpose: context.purpose,
          justification: context.justification,
          case_id: context.caseId,
        },
      } as any;

      const policyDecision = await opaClient.evaluatePolicy(
        'sensitive/access',
        decisionInput,
      );

      if (!policyDecision.allow) {
        await recordAudit(
          auditStore,
          req,
          context,
          'deny',
          policyDecision.reason || 'policy_denied',
          action,
        );
        return res.status(403).json({
          code: 'SENSITIVE_CONTEXT_DENIED',
          reason: policyDecision.reason || 'Access denied by policy',
          audit: policyDecision.auditLog,
        });
      }

      (req as any).sensitiveAccessContext = context;
      res.locals.sensitiveAccessContext = context;
      await recordAudit(auditStore, req, context, 'allow', 'policy_allowed', action);
      return next();
    } catch (error: any) {
      await recordAudit(auditStore, req, context, 'deny', 'policy_error', action);
      return res.status(500).json({
        code: 'SENSITIVE_CONTEXT_ERROR',
        message: 'Failed to evaluate sensitive access policy',
      });
    }
  };
}

export const sensitiveContextMiddleware = createSensitiveContextMiddleware();

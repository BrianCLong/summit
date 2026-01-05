import { Request, Response, NextFunction } from 'express';
import { AppendOnlyAuditStore } from '../audit/appendOnlyAuditStore.js';
import { randomUUID } from 'crypto';

export interface HighRiskApprovalOptions {
  routes?: string[];
  auditStore?: AppendOnlyAuditStore;
  action?: string;
}

const defaultAuditStore = new AppendOnlyAuditStore();
const DEFAULT_ROUTES = ['/api/exports', '/api/analytics/export'];

function matches(req: Request, routes: string[]): boolean {
  const path = `${req.baseUrl || ''}${req.path}`;
  return routes.some((prefix) => path.startsWith(prefix));
}

export function createHighRiskApprovalMiddleware(
  options: HighRiskApprovalOptions = {},
) {
  const routes = options.routes ?? DEFAULT_ROUTES;
  const auditStore = options.auditStore ?? defaultAuditStore;
  const action = options.action ?? 'high_risk_action';

  return async function highRiskApproval(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    if (!matches(req, routes)) return next();

    const stepUpToken = req.headers['x-step-up-token'] as string | undefined;
    const approvalToken = req.headers['x-approval-token'] as string | undefined;

    if (!stepUpToken && !approvalToken) {
      await auditStore.append({
        version: 'audit_event_v1',
        actor: {
          type: 'user',
          id: (req as any).user?.id || (req as any).user?.sub,
        },
        action,
        resource: {
          type: req.method,
          name: req.path,
          owner:
            (req as any).tenantId ||
            (req as any).tenant_id ||
            (req.headers['x-tenant-id'] as string) ||
            'unknown',
        },
        classification: 'restricted',
        policy_version: process.env.OPA_POLICY_VERSION || '1.0',
        decision_id: randomUUID(),
        trace_id: (req as any).traceId || randomUUID(),
        timestamp: new Date().toISOString(),
        customer:
          (req as any).tenantId ||
          (req as any).tenant_id ||
          (req.headers['x-tenant-id'] as string) ||
          'unknown',
        metadata: {
          decision: 'deny',
          reason: 'approval_required',
        },
      });

      return res.status(403).json({
        code: 'APPROVAL_REQUIRED',
        requiresApproval: true,
        requiresStepUp: true,
        message:
          'This high-risk action requires step-up authentication or an approval token.',
      });
    }

    await auditStore.append({
      version: 'audit_event_v1',
      actor: {
        type: 'user',
        id: (req as any).user?.id || (req as any).user?.sub,
      },
      action,
      resource: {
        type: req.method,
        name: req.path,
        owner:
          (req as any).tenantId ||
          (req as any).tenant_id ||
          (req.headers['x-tenant-id'] as string) ||
          'unknown',
      },
      classification: 'restricted',
      policy_version: process.env.OPA_POLICY_VERSION || '1.0',
      decision_id: randomUUID(),
      trace_id: (req as any).traceId || randomUUID(),
      timestamp: new Date().toISOString(),
      customer:
        (req as any).tenantId ||
        (req as any).tenant_id ||
        (req.headers['x-tenant-id'] as string) ||
        'unknown',
      metadata: {
        decision: 'allow',
        stepUpToken: stepUpToken ? 'present' : 'missing',
        approvalToken: approvalToken ? 'present' : 'missing',
      },
    });

    return next();
  };
}

export const highRiskApprovalMiddleware = createHighRiskApprovalMiddleware();

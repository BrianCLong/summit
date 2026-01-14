import { Request, Response, NextFunction } from 'express';
import { GovernanceVerdict } from '../../../packages/core/src/governance/verdict';
import { checkKillSwitch } from '../governance/kill_switch';
import { randomUUID } from 'crypto';

// Augment Express Request interface
declare global {
  namespace Express {
    interface Request {
      governanceVerdict?: GovernanceVerdict;
      tenantId?: string;
    }
  }
}

export const tenantIsolationMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const tenantIdHeader = req.headers['x-tenant-id'] as string;
  // Assuming auth middleware has run and populated user, otherwise we rely on header or reject
  // For this exercise we primarily check the header and consistency.
  // In a real app, req.user.tenantId would be the source of truth.

  // Mocking auth principal for now if not present, to simulate check against auth
  const authTenantId = (req as any).user?.tenantId;

  let tenantId = tenantIdHeader || authTenantId;

  const reasons = [];

  if (!tenantId) {
     reasons.push({ code: 'MISSING_TENANT_ID', message: 'Tenant ID is required' });
     finalizeVerdict(req, res, 'deny', reasons);
     return;
  }

  if (authTenantId && tenantIdHeader && authTenantId !== tenantIdHeader) {
      reasons.push({ code: 'TENANT_MISMATCH', message: 'Tenant ID in header does not match authenticated user' });
      finalizeVerdict(req, res, 'deny', reasons);
      return;
  }

  req.tenantId = tenantId;

  // Kill Switch Check
  const isAdmin = (req as any).user?.roles?.includes('admin') || false;
  const isBreakGlass = req.headers['x-break-glass'] === 'true';
  const killSwitchResult = checkKillSwitch(tenantId, req.path, req.method, isAdmin, isBreakGlass);

  if (!killSwitchResult.allowed) {
      finalizeVerdict(req, res, killSwitchResult.status, killSwitchResult.reasons);
      return;
  }

  // Initialize Verdict for the request
  req.governanceVerdict = {
      status: killSwitchResult.status,
      reasons: killSwitchResult.reasons,
      tenant_id: tenantId,
      policy_version: process.env.POLICY_VERSION || 'unknown',
      timestamp: new Date().toISOString(),
      evidence: {
          request_id: (req.headers['x-request-id'] as string) || randomUUID(),
          actor: (req as any).user?.id || 'anonymous',
          route: req.path,
      }
  };

  // Add verdict propagation to response
  const originalJson = res.json;
  res.json = function (body) {
      if (req.governanceVerdict) {
          // Add to header
          res.setHeader('X-Governance-Status', req.governanceVerdict.status);
          res.setHeader('X-Governance-Policy-Version', req.governanceVerdict.policy_version);

          // Add to body if it's an envelope or we can wrap it
          // Assuming we want to wrap or inject if it's an object
          if (typeof body === 'object' && body !== null) {
              // Check if it already has governanceVerdict (from legacy or other middleware)
              // If so, we might want to merge or overwrite.
              // For this task, we enforce ours.
              body.governanceVerdict = req.governanceVerdict;
          }
      }
      return originalJson.call(this, body);
  };

  next();
};

function finalizeVerdict(req: Request, res: Response, status: GovernanceVerdict['status'], reasons: any[]) {
    const verdict: GovernanceVerdict = {
        status,
        reasons,
        tenant_id: req.tenantId || 'unknown',
        policy_version: process.env.POLICY_VERSION || 'unknown',
        timestamp: new Date().toISOString(),
        evidence: {
            request_id: (req.headers['x-request-id'] as string) || randomUUID(),
            actor: (req as any).user?.id || 'anonymous',
            route: req.path,
        }
    };

    res.setHeader('X-Governance-Status', status);
    res.status(status === 'deny' ? 403 : 200).json({
        error: status === 'deny' ? 'Access Denied' : undefined,
        governanceVerdict: verdict
    });
}

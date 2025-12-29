import express from 'express';
import { ensureAuthenticated } from '../middleware/auth.js';
import {
  ActionPolicyService,
  calculateRequestHash,
} from '../services/ActionPolicyService.js';
import type { PreflightRequest } from '../../../packages/policy-audit/src/types';
import {
  AuthorizationContext,
  Permission,
  Role,
  can,
  normalizeRole,
} from '../authz/permissions.js';

const RBAC_PERMISSION_MATRIX_FLAG = 'RBAC_PERMISSION_MATRIX_ENABLED';
const RBAC_FORBIDDEN_CODE = 'AUTHZ_ROLE_FORBIDDEN';

const isRbacMatrixEnabled = () =>
  (process.env[RBAC_PERMISSION_MATRIX_FLAG] || '').toLowerCase() === 'true';

const buildAuthorizationContext = (req: express.Request): AuthorizationContext => {
  const user = (req as any).user || {};
  const rawPermissions = Array.isArray(user.permissions)
    ? user.permissions.map((permission: unknown) => String(permission))
    : undefined;

  return {
    role: normalizeRole(user.role as string | undefined),
    permissions: rawPermissions,
    userId: user.sub || user.id,
    tenantId: user.tenantId || user.tenant_id,
  };
};

const enforcePolicyOverridePermission: express.RequestHandler = (
  req,
  res,
  next,
) => {
  if (!isRbacMatrixEnabled()) {
    return next();
  }

  const context = buildAuthorizationContext(req);

  if (can(Permission.POLICY_OVERRIDE, context)) {
    return next();
  }

  return res.status(403).json({
    error: 'forbidden',
    code: RBAC_FORBIDDEN_CODE,
    required_permission: Permission.POLICY_OVERRIDE,
    role: context.role || 'UNKNOWN',
  });
};

const router = express.Router();
const actionPolicyService = new ActionPolicyService();

router.use(express.json());

const buildRequest = (req: express.Request): PreflightRequest => {
  const user = (req as any).user || {};
  const action = String(req.body.action || '').toUpperCase();
  const policyVersion = req.body.policyVersion || req.body.context?.policyVersion;

  return {
    action,
    actor: {
      id: user.sub || user.id || 'anonymous',
      role: user.role,
      tenantId: user.tenantId || user.tenant_id,
    },
    resource: req.body.resource,
    payload: req.body.payload,
    approvers: Array.isArray(req.body.approvers)
      ? req.body.approvers.map((id: unknown) => String(id))
      : undefined,
    policyVersion,
    context: { ...(req.body.context || {}), policyVersion },
  };
};

router.post('/preflight', ensureAuthenticated, async (req, res, next) => {
  try {
    const request = buildRequest(req);
    if (!request.action) {
      return res.status(400).json({ error: 'action is required' });
    }

    const result = await actionPolicyService.preflight(request, {
      correlationId: req.correlationId,
      ip: req.ip,
      userAgent: req.get('user-agent') || undefined,
    });

    return res.status(result.decision.allow ? 200 : 403).json({
      preflight_id: result.preflightId,
      decision: result.decision,
      request_hash: result.requestHash,
      correlation_id: req.correlationId,
    });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/execute',
  ensureAuthenticated,
  enforcePolicyOverridePermission,
  async (req, res, next) => {
  try {
    const preflightId = req.body.preflight_id as string | undefined;
    if (!preflightId) {
      return res
        .status(428)
        .json({ error: 'preflight_id is required to execute this action' });
    }

    const request = buildRequest(req);
    if (!request.action) {
      return res.status(400).json({ error: 'action is required' });
    }

    const validation = await actionPolicyService.validateExecution(
      preflightId,
      request,
    );

    switch (validation.status) {
      case 'missing':
        return res.status(404).json({ error: 'preflight decision not found' });
      case 'expired':
        return res.status(410).json({
          error: 'preflight decision expired',
          expires_at: validation.expiresAt,
        });
      case 'hash_mismatch':
        return res.status(409).json({
          error: 'request does not match preflight hash',
          expected: validation.expected,
          actual: validation.actual,
        });
      case 'blocked':
        return res.status(403).json({
          error: validation.reason || 'policy obligations not met',
          obligation: validation.obligation,
        });
      case 'ok':
        return res.status(200).json({
          ok: true,
          correlation_id: req.correlationId,
          request_hash: validation.requestHash,
          decision: validation.decision,
        });
      default:
        return res.status(500).json({ error: 'unknown preflight validation state' });
    }
  } catch (error) {
    next(error);
  }
  },
);

router.get('/hash', ensureAuthenticated, (req, res) => {
  const request = buildRequest(req);
  return res.json({ request_hash: calculateRequestHash(request) });
});

export const actionsRouter = router;

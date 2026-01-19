import { Router, type Response } from 'express';

import {
  type PreflightDecisionContract,
  type PreflightRequestContract
} from '../../contracts/actions.js';
import { type AuthenticatedRequest } from '../../middleware/security.js';
import {
  type PolicyDecisionStore,
  type PreflightRecord as PolicyDecisionRecord,
} from '../../services/PolicyDecisionStore.js';
import {
  type PolicyDecisionResult,
  type PolicySimulationService
} from '../../services/policyService.js';
import { RBACManager } from '../../../../../packages/authentication/src/rbac/rbac-manager.js';
import { requirePermission } from '../../middleware/security.js';

interface PreflightRouterDeps {
  policyService: PolicySimulationService;
  decisionStore: PolicyDecisionStore;
  rbacManager: RBACManager;
}

function normalizeRequest(body: Partial<PreflightRequestContract>): {
  valid: boolean;
  request?: PreflightRequestContract;
  error?: string;
} {
  if (!body.subject?.id || !body.action?.name) {
    return {
      valid: false,
      error: 'subject.id and action.name are required'
    };
  }

  return {
    valid: true,
    request: {
      subject: {
        id: body.subject.id,
        roles: body.subject.roles || [],
        tenantId: body.subject.tenantId
      },
      action: {
        name: body.action.name,
        scope: body.action.scope,
        attributes: body.action.attributes || {}
      },
      resource: body.resource,
      context: body.context
    }
  };
}

/**
 * Extract policy ID from the raw OPA decision metadata if available.
 * OPA decisions may include policy path/name in the decision result.
 */
function extractPolicyId(record: PolicyDecisionRecord): string | undefined {
  // Check for policy_id in the raw decision metadata
  const rawDecision = record.rawDecision as Record<string, unknown> | undefined;
  if (rawDecision?.policy_id && typeof rawDecision.policy_id === 'string') {
    return rawDecision.policy_id;
  }
  // Check for policy path in OPA result structure
  if (rawDecision?.policy_path && typeof rawDecision.policy_path === 'string') {
    return rawDecision.policy_path;
  }
  return undefined;
}

function toResponsePayload(
  record: PolicyDecisionRecord
): PreflightDecisionContract {
  return {
    decisionId: record.id,
    preflight_id: record.id,
    policy_id: extractPolicyId(record),
    decision: record.allow ? 'allow' : 'deny',
    reason: record.reason,
    obligations: record.obligations,
    redactions: record.redactions
  };
}

function mergeRedactions(decision: PolicyDecisionResult): PolicyDecisionResult {
  const merged = new Set(decision.redactions);

  decision.obligations.forEach((obligation) => {
    if (
      (obligation.code === 'redact' || obligation.code === 'mask') &&
      obligation.targets
    ) {
      obligation.targets.forEach((target) => merged.add(target));
    }
  });

  return {
    ...decision,
    redactions: [...merged]
  };
}

export function createPreflightRouter({
  decisionStore,
  policyService,
  rbacManager
}: PreflightRouterDeps): Router {
  const router = Router();

  router.post(
    '/preflight',
    requirePermission(rbacManager, 'actions:preflight', 'evaluate'),
    async (
      req: AuthenticatedRequest,
      res: Response
    ) => {
      const normalized = normalizeRequest(req.body || {});

      if (!normalized.valid || !normalized.request) {
        return res.status(400).json({
          error: normalized.error || 'invalid_request'
        });
      }

      // SECURITY: Enforce tenant isolation (CN-003)
      // Ensure the preflight subject's tenant matches the authenticated tenant context
      if (req.tenantId && normalized.request.subject.tenantId !== req.tenantId) {
        return res.status(403).json({
          error: 'tenant_isolation_violation',
          message: 'Cannot preflight for a different tenant context'
        });
      }

      try {
        const decision = await policyService.simulate(normalized.request);
        const mergedDecision = mergeRedactions(decision);
        const record = await decisionStore.insert(
          normalized.request,
          mergedDecision
        );

        return res.status(200).json(toResponsePayload(record));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return res.status(502).json({
          error: 'policy_simulation_failed',
          message
        });
      }
    }
  );

  return router;
}

import { Router, type Request, type Response } from 'express';

import {
  type PreflightDecisionContract,
  type PreflightRequestContract
} from '../../contracts/actions.js';
import {
  PolicyDecisionStore,
  type PolicyDecisionRecord
} from '../../db/models/policy_decisions.js';
import {
  type PolicyDecisionResult,
  type PolicySimulationService
} from '../../services/policyService.js';

interface PreflightRouterDeps {
  policyService: PolicySimulationService;
  decisionStore: PolicyDecisionStore;
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

function toResponsePayload(
  record: PolicyDecisionRecord
): PreflightDecisionContract {
  const policyId = extractPolicyId(record.rawDecision);
  return {
    decisionId: record.id,
    preflight_id: record.id,
    policy_id: policyId,
    decision: record.allow ? 'allow' : 'deny',
    reason: record.reason,
    obligations: record.obligations,
    redactions: record.redactions
  };
}

function extractPolicyId(rawDecision: unknown): string | undefined {
  if (!rawDecision || typeof rawDecision !== 'object') {
    return undefined;
  }

  const result = (rawDecision as { result?: Record<string, unknown> }).result;
  if (!result) {
    return undefined;
  }

  const candidates = [
    result.policy_id,
    result.policy,
    result.matched_policy,
    result.rule,
    result.path
  ];

  return candidates.find((candidate) => typeof candidate === 'string') as
    | string
    | undefined;
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
  policyService
}: PreflightRouterDeps): Router {
  const router = Router();

  router.post(
    '/preflight',
    async (
      req: Request<unknown, unknown, Partial<PreflightRequestContract>>,
      res: Response
    ) => {
      const normalized = normalizeRequest(req.body || {});

      if (!normalized.valid || !normalized.request) {
        return res.status(400).json({
          error: normalized.error || 'invalid_request'
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

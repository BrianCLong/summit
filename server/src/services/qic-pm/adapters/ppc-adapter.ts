import type { PolicyDecisionResult, QueryContext } from '../types.js';
import { QueryIntentPolicyMapper } from '../query-intent-policy-mapper.js';

export interface PpcDirective {
  pipeline: 'PPC';
  action: PolicyDecisionResult['decision']['action'];
  transforms: string[];
  redactions: string[];
  obligations: string[];
  metadata: {
    intent: PolicyDecisionResult['intent'];
    confidence: number;
    policyId: string;
  };
  explanation: PolicyDecisionResult['explanation'];
}

export interface PpcRequest {
  query: string;
  context?: QueryContext;
}

export const createPpcAdapter = (mapper: QueryIntentPolicyMapper) => ({
  toDirective(request: PpcRequest): PpcDirective {
    const result = mapper.evaluate(request.query, request.context ?? {});

    return {
      pipeline: 'PPC',
      action: result.decision.action,
      transforms: result.decision.transforms ? [...result.decision.transforms] : [],
      redactions: result.decision.redactFields ? [...result.decision.redactFields] : [],
      obligations: result.decision.obligations ? [...result.decision.obligations] : [],
      metadata: {
        intent: result.intent,
        confidence: Number(result.confidence.toFixed(4)),
        policyId: result.decision.policyId,
      },
      explanation: result.explanation.map((step) => ({
        ...step,
        details: step.details ? { ...step.details } : undefined,
      })),
    };
  },
});

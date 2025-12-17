import type { PolicyDecisionResult, QueryContext } from '../types.js';
import { QueryIntentPolicyMapper } from '../query-intent-policy-mapper.js';

export interface RsrRoutingRequest {
  query: string;
  context?: QueryContext;
  correlationId?: string;
}

export interface RsrRoutingDecision {
  router: 'RSR';
  intent: PolicyDecisionResult['intent'];
  confidence: number;
  action: PolicyDecisionResult['decision']['action'];
  allow: boolean;
  explanation: PolicyDecisionResult['explanation'];
  policy: PolicyDecisionResult['decision'];
  correlationId?: string;
}

export const createRsrAdapter = (mapper: QueryIntentPolicyMapper) => ({
  evaluate(request: RsrRoutingRequest): RsrRoutingDecision {
    const context = request.context ?? {};
    const result = mapper.evaluate(request.query, context);

    const allow = result.decision.action === 'allow' || result.decision.action === 'transform';

    return {
      router: 'RSR',
      intent: result.intent,
      confidence: Number(result.confidence.toFixed(4)),
      action: result.decision.action,
      allow,
      explanation: result.explanation.map((step) => ({
        ...step,
        details: step.details ? { ...step.details } : undefined,
      })),
      policy: {
        ...result.decision,
        obligations: result.decision.obligations ? [...result.decision.obligations] : undefined,
        transforms: result.decision.transforms ? [...result.decision.transforms] : undefined,
        redactFields: result.decision.redactFields ? [...result.decision.redactFields] : undefined,
      },
      correlationId: request.correlationId,
    };
  },
});

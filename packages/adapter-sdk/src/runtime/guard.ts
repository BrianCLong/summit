import { AdapterLifecycleStage, AdapterRequest } from '../contracts/types.js';

export interface PolicyDecision {
  decision: 'allow' | 'deny';
  reason?: string;
  receiptId?: string;
}

export type PolicyEvaluator = (
  lifecycle: AdapterLifecycleStage,
  request: AdapterRequest,
) => Promise<PolicyDecision>;

export async function enforcePolicy(
  lifecycle: AdapterLifecycleStage,
  request: AdapterRequest,
  evaluator: PolicyEvaluator,
): Promise<PolicyDecision> {
  const decision = await evaluator(lifecycle, request);
  if (decision.decision === 'deny') {
    const reason = decision.reason ?? 'policy denied execution';
    throw new Error(`Adapter policy violation: ${reason}`);
  }
  return decision;
}

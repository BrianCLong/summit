import type { Decision, PolicyContext, PolicyRule } from '../contracts/types.js';
import { evaluatePolicyContext as evaluatePolicyContextImpl } from './localEvaluator.js';

export function evaluatePolicyContext(
  context: PolicyContext,
  policies: PolicyRule[],
): Decision {
  return evaluatePolicyContextImpl(context, policies) as Decision;
}

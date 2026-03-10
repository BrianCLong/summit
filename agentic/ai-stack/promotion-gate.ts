import { EvalSummary } from '../../benchmark/ai-stack/benchmark-runner.js';

export function canPromote(result: EvalSummary): boolean {
  return result.hiddenEvalPass &&
         result.costDeltaPct <= 10 &&
         result.qualityDeltaPct >= 5 &&
         result.policyViolations === 0;
}

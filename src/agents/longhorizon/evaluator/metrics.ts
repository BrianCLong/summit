// src/agents/longhorizon/evaluator/metrics.ts
export interface LongHorizonMetrics {
  decomposition_score: number; // 0-1
  consistency_score: number;   // 0-1
  refinement_score: number;    // 0-1
  total_tool_calls: number;
  total_tokens: number;
  runtime_ms: number;
}

export function calculateMetrics(
  stages_completed: number,
  total_stages: number,
  objectives_met: boolean[],
  refinements_successful: boolean[],
  resource_usage: { tool_calls: number; tokens: number; runtime_ms: number }
): LongHorizonMetrics {
  const decomposition_score = total_stages > 0 ? stages_completed / total_stages : 0;

  const consistency_score = objectives_met.length > 0
    ? objectives_met.filter(Boolean).length / objectives_met.length
    : 0;

  const refinement_score = refinements_successful.length > 0
    ? refinements_successful.filter(Boolean).length / refinements_successful.length
    : 1; // Default to 1 if no refinements were attempted

  return {
    decomposition_score,
    consistency_score,
    refinement_score,
    total_tool_calls: resource_usage.tool_calls,
    total_tokens: resource_usage.tokens,
    runtime_ms: resource_usage.runtime_ms,
  };
}

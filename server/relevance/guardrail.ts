export function guardrail(metrics) {
  // Fail rollout if nDCG drops > 2% or bad click skew rises > 3%
  return (
    metrics.ndcg10_v2 >= metrics.ndcg10_v1 * 0.98 &&
    metrics.bad_skew_v2 <= metrics.bad_skew_v1 * 1.03
  );
}

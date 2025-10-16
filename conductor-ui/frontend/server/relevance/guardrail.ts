export interface GuardrailMetrics {
  ndcg10_v1: number;
  ndcg10_v2: number;
  bad_skew_v1: number;
  bad_skew_v2: number;
}

export function guardrail(metrics: GuardrailMetrics): boolean {
  // Fail rollout if nDCG drops > 2% or bad click skew rises > 3%
  const ndcgThreshold = 0.98; // Allow max 2% drop
  const skewThreshold = 1.03; // Allow max 3% increase

  const ndcgPass = metrics.ndcg10_v2 >= metrics.ndcg10_v1 * ndcgThreshold;
  const skewPass = metrics.bad_skew_v2 <= metrics.bad_skew_v1 * skewThreshold;

  return ndcgPass && skewPass;
}

export function getGuardrailReport(metrics: GuardrailMetrics): {
  passed: boolean;
  ndcgDelta: number;
  skewDelta: number;
  details: string;
} {
  const passed = guardrail(metrics);
  const ndcgDelta =
    ((metrics.ndcg10_v2 - metrics.ndcg10_v1) / metrics.ndcg10_v1) * 100;
  const skewDelta =
    ((metrics.bad_skew_v2 - metrics.bad_skew_v1) / metrics.bad_skew_v1) * 100;

  const details = `
    nDCG@10: v1=${metrics.ndcg10_v1.toFixed(4)}, v2=${metrics.ndcg10_v2.toFixed(4)} (${ndcgDelta.toFixed(2)}% change)
    Bad Click Skew: v1=${metrics.bad_skew_v1.toFixed(4)}, v2=${metrics.bad_skew_v2.toFixed(4)} (${skewDelta.toFixed(2)}% change)
    Status: ${passed ? 'PASS' : 'FAIL'}
  `.trim();

  return {
    passed,
    ndcgDelta,
    skewDelta,
    details,
  };
}

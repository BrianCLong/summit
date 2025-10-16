export async function evaluateCanary(
  runId: string,
  thresholds: { errorRatePct: number; p95LatencyMs: number },
  fetchMetrics: () => Promise<{ errorRate: number; p95: number }>,
  rollback: () => Promise<void>,
) {
  const m = await fetchMetrics();
  if (
    m.errorRate * 100 > thresholds.errorRatePct ||
    m.p95 > thresholds.p95LatencyMs
  ) {
    await rollback();
    return { rolledBack: true } as const;
  }
  return { rolledBack: false } as const;
}

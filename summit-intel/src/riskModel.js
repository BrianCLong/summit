export function predictCIRisk(metrics) {
  const changedFileFactor = Math.min((metrics.changedFiles ?? 0) / 200, 1) * 0.15;

  const score =
    metrics.newDependencies * 0.25 +
    metrics.highRiskDeps * 0.4 +
    metrics.driftScore * 0.2 +
    changedFileFactor;

  const probability = Math.min(Number(score.toFixed(4)), 1);
  const grade = probability >= 0.7 ? 'HIGH' : probability >= 0.4 ? 'MEDIUM' : 'LOW';

  return {
    riskScore: score,
    probability,
    grade,
  };
}

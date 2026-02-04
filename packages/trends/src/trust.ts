export function computeTrustScore(_signals: Record<string, number>): number | null {
  // Feature-flagged stub: return null until calibrated with real data/evidence
  if (process.env.FF_TREND_TRUST_SCORE !== "1") {
    return null;
  }
  // TODO: implement with evidence-backed calibration
  return 0.0;
}

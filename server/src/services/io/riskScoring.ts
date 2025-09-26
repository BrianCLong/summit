export interface RiskSignalInput {
  severity?: number | null;
  reach_estimate?: number | null;
  confidence?: number | null;
  is_authority_impersonation?: boolean | null;
  is_synthetic_media?: boolean | null;
  detector?: string | null;
  story_id?: string | null;
  anomalyIndicators?: Array<{ weight: number; score: number }>;
}

export interface RiskComputationResult {
  riskScore: number;
  anomalyScore: number;
  forecastHorizonMinutes: number;
  predictedReach: number;
  provenanceConfidence: number;
}

const STORY_WEIGHT: Record<string, number> = {
  'Election-Process-Suppression/Voice-Clone/Call-Back-CTA': 1.15,
  'Disaster-Authority-Blame/Agency-Incompetence': 1.05,
  'Finance-Fake-Exec/Deepfake-Video': 1.12,
  'Geopolitics-Ukraine/Legitimacy-Narratives': 1.08,
  'Geopolitics-Taiwan/Deterrence-Failure': 1.1,
  'Middle-East/Humanitarian-Obstruction-Claims': 1.06,
  'Critical-Infrastructure/Utility-Grid-Compromise': 1.2,
  'Election-Logistics/Multi-Lingual-Suppression': 1.13,
  'Financial-Markets/AI-Pump-And-Dump': 1.14,
};

function clamp(value: number, min = 0, max = 1): number {
  if (Number.isNaN(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function computeBaseRisk({ severity, reach_estimate, confidence }: RiskSignalInput): number {
  const sev = clamp((severity ?? 0) / 5);
  const reach = clamp(Math.log10(Math.max(reach_estimate ?? 1, 1)) / 6);
  const conf = clamp(confidence ?? 0.5);
  return clamp((sev * 0.45) + (reach * 0.35) + (conf * 0.2));
}

function computeAnomalyScore(input: RiskSignalInput): number {
  const base = input.anomalyIndicators?.reduce((acc, signal) => acc + signal.weight * signal.score, 0) ?? 0;
  const impersonationBoost = input.is_authority_impersonation ? 0.12 : 0;
  const syntheticBoost = input.is_synthetic_media ? 0.08 : 0;
  return clamp(base + impersonationBoost + syntheticBoost);
}

function computeForecastHorizon(severity?: number | null, reach?: number | null): number {
  const base = 60 + (severity ?? 0) * 15;
  const reachFactor = reach ? Math.min(Math.floor(reach / 50000) * 15, 240) : 0;
  return Math.max(30, Math.min(720, base + reachFactor));
}

function computeProvenanceConfidence(input: RiskSignalInput, anomalyScore: number): number {
  let base = 0.5 + (input.is_synthetic_media ? -0.15 : 0.05);
  if (input.is_authority_impersonation) {
    base -= 0.1;
  }
  base -= anomalyScore * 0.25;
  return clamp(base);
}

export function computeRiskSignals(input: RiskSignalInput): RiskComputationResult {
  const baseRisk = computeBaseRisk(input);
  const anomalyScore = computeAnomalyScore(input);
  const storyWeight = STORY_WEIGHT[input.story_id ?? ''] ?? 1.0;
  const impersonationMultiplier = input.is_authority_impersonation ? 1.12 : 1;
  const syntheticMultiplier = input.is_synthetic_media ? 1.08 : 1;
  const detectorBoost = input.detector?.includes('spoof') ? 1.05 : 1;
  const riskScore = clamp(baseRisk * storyWeight * impersonationMultiplier * syntheticMultiplier * detectorBoost);
  const forecastHorizonMinutes = computeForecastHorizon(input.severity, input.reach_estimate);
  const predictedReach = Math.round((input.reach_estimate ?? 0) * (1 + anomalyScore * 0.75 + baseRisk * 0.5));
  const provenanceConfidence = computeProvenanceConfidence(input, anomalyScore);

  return {
    riskScore,
    anomalyScore,
    forecastHorizonMinutes,
    predictedReach,
    provenanceConfidence,
  };
}

import { CveRecord, RiskComputationOptions, Severity, ToolRiskProfile } from './types.js';

const DEFAULT_SEVERITY_WEIGHTS: Record<Severity, number> = {
  CRITICAL: 10,
  HIGH: 7,
  MEDIUM: 4,
  LOW: 2,
  UNKNOWN: 1
};

const DEFAULT_DATA_ACCESS_WEIGHTS: Record<ToolRiskProfile['dataAccessScope'], number> = {
  none: 0,
  read: 1,
  write: 3,
  admin: 5
};

const DEFAULT_NETWORK_WEIGHTS: Record<'none' | 'restricted' | 'unrestricted', number> = {
  none: 0,
  restricted: 1,
  unrestricted: 4
};

export function normalizeSeverity(raw: string | undefined): Severity {
  switch (raw?.toUpperCase()) {
    case 'CRITICAL':
      return 'CRITICAL';
    case 'HIGH':
      return 'HIGH';
    case 'MEDIUM':
      return 'MEDIUM';
    case 'LOW':
      return 'LOW';
    default:
      return 'UNKNOWN';
  }
}

export function computeRiskScore(
  profile: ToolRiskProfile,
  options: RiskComputationOptions = {}
): number {
  const base = options.baseScore ?? 1;
  const severityWeights = { ...DEFAULT_SEVERITY_WEIGHTS, ...(options.cveWeightOverride ?? {}) };
  const dataWeights = { ...DEFAULT_DATA_ACCESS_WEIGHTS, ...(options.dataAccessWeights ?? {}) };
  const networkWeights = { ...DEFAULT_NETWORK_WEIGHTS, ...(options.networkWeights ?? {}) };

  const cveScore = profile.cves.reduce((total, cve) => total + severityWeights[cve.severity], 0);
  const dataScore = dataWeights[profile.dataAccessScope];
  const networkScore = profile.networkEgressClasses.reduce(
    (total, cls) => total + networkWeights[cls],
    0
  );

  const rawScore = base + cveScore + dataScore + networkScore;
  return Number(rawScore.toFixed(2));
}

export function scoreCveRecord(record: CveRecord, options?: RiskComputationOptions): number {
  const severityWeights = { ...DEFAULT_SEVERITY_WEIGHTS, ...(options?.cveWeightOverride ?? {}) };
  return severityWeights[record.severity];
}

export function severityWeights() {
  return { ...DEFAULT_SEVERITY_WEIGHTS };
}

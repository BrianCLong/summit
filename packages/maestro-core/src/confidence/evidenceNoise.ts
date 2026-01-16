import { ToolType } from './toolType.js';
import {
  EvidenceNoiseSignals,
  ProvenanceCoverage,
  VerificationSignals,
} from './ConfidenceReport.js';

export interface EvidenceItem {
  sourceId?: string;
  url?: string;
  snippet?: string;
  text?: string;
  retrievedAt?: string;
  publishedAt?: string;
  contradiction?: boolean;
}

export interface EvidenceBundle {
  items: EvidenceItem[];
  contradictions?: string[];
}

export interface EvidenceNoiseResult {
  noise: EvidenceNoiseSignals;
  provenance: ProvenanceCoverage;
}

export interface EvidenceCapConfig {
  cap: number;
  entropy_high: number;
  agreement_low: number;
  provenance_low: number;
}

export interface EvidenceCapResult {
  p_correct: number;
  cap_applied: boolean;
  notes: string[];
}

const DEFAULT_CAP_CONFIG: EvidenceCapConfig = {
  cap: 0.65,
  entropy_high: 0.7,
  agreement_low: 0.4,
  provenance_low: 0.6,
};

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

const getSourceKey = (item: EvidenceItem): string => {
  if (item.url) {
    try {
      return new URL(item.url).hostname || 'unknown';
    } catch {
      return item.url;
    }
  }
  if (item.sourceId) {
    return item.sourceId;
  }
  return 'unknown';
};

const shannonEntropy = (counts: number[]): number => {
  const total = counts.reduce((sum, value) => sum + value, 0);
  if (total === 0) {
    return 0;
  }
  const entropy = counts.reduce((sum, value) => {
    if (value === 0) {
      return sum;
    }
    const p = value / total;
    return sum - p * Math.log2(p);
  }, 0);
  const maxEntropy = Math.log2(counts.length || 1);
  if (maxEntropy === 0) {
    return 0;
  }
  return clamp01(entropy / maxEntropy);
};

const computeRecencyRisk = (
  items: EvidenceItem[],
  now: Date,
): { recency_risk: number; recency_known: boolean } => {
  const timestamps = items
    .map((item) => item.publishedAt ?? item.retrievedAt)
    .filter((value): value is string => Boolean(value));

  if (timestamps.length === 0) {
    return { recency_risk: 0.5, recency_known: false };
  }

  const risks = timestamps.map((stamp) => {
    const parsed = new Date(stamp).getTime();
    if (Number.isNaN(parsed)) {
      return 0.5;
    }
    const ageDays = (now.getTime() - parsed) / (1000 * 60 * 60 * 24);
    if (ageDays <= 7) {
      return 0;
    }
    if (ageDays <= 30) {
      return 0.25;
    }
    if (ageDays <= 180) {
      return 0.5;
    }
    if (ageDays <= 365) {
      return 0.75;
    }
    return 1;
  });

  return {
    recency_risk: clamp01(Math.max(...risks)),
    recency_known: true,
  };
};

export const scoreEvidenceNoise = (
  bundle: EvidenceBundle,
  now: Date = new Date(),
): EvidenceNoiseResult => {
  const items = bundle.items ?? [];
  const sourceKeys = items.map((item) => getSourceKey(item));
  const counts = Object.values(
    sourceKeys.reduce<Record<string, number>>((acc, key) => {
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {}),
  );

  const total = items.length;
  const maxCount = counts.length > 0 ? Math.max(...counts) : 0;
  const sourceAgreement = total === 0 ? 0 : clamp01(maxCount / total);
  const retrievalEntropy = counts.length === 0 ? 0 : shannonEntropy(counts);
  const contradictionCount =
    (bundle.contradictions?.length ?? 0) +
    items.filter((item) => item.contradiction).length;

  const provenanceCount = items.filter(
    (item) => Boolean(item.url || item.sourceId || item.snippet),
  ).length;
  const provenanceCoverage = total === 0 ? 0 : clamp01(provenanceCount / total);

  const recency = computeRecencyRisk(items, now);

  return {
    noise: {
      source_agreement_score: sourceAgreement,
      retrieval_entropy: retrievalEntropy,
      contradiction_count: contradictionCount,
      provenance_coverage: provenanceCoverage,
      recency_risk: recency.recency_risk,
      recency_known: recency.recency_known,
    },
    provenance: {
      coverage: provenanceCoverage,
      sources_with_provenance: provenanceCount,
      total_sources: total,
    },
  };
};

const hasVerificationSignals = (signals: VerificationSignals): boolean =>
  Object.values(signals).some((value) => value > 0);

export const applyEvidenceNoiseCap = (
  pCorrect: number,
  toolTypes: ToolType[],
  noiseSignals: EvidenceNoiseSignals,
  verificationSignals: VerificationSignals,
  config: EvidenceCapConfig = DEFAULT_CAP_CONFIG,
): EvidenceCapResult => {
  const notes: string[] = [];
  const isEvidence = toolTypes.includes('EVIDENCE');
  const hasVerification = hasVerificationSignals(verificationSignals);

  const noisy =
    noiseSignals.retrieval_entropy >= config.entropy_high ||
    noiseSignals.source_agreement_score <= config.agreement_low ||
    noiseSignals.contradiction_count > 0 ||
    noiseSignals.provenance_coverage <= config.provenance_low;

  if (isEvidence && !hasVerification && noisy) {
    const capped = Math.min(pCorrect, config.cap);
    notes.push(
      `Confidence capped at ${config.cap.toFixed(2)} due to noisy evidence without verification.`,
    );
    return {
      p_correct: capped,
      cap_applied: capped !== pCorrect,
      notes,
    };
  }

  return {
    p_correct: pCorrect,
    cap_applied: false,
    notes,
  };
};

export const DEFAULT_EVIDENCE_CAP_CONFIG = DEFAULT_CAP_CONFIG;

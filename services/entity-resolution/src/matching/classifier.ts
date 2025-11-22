/**
 * Entity Resolution Service - Classifier with Explainability
 *
 * Simple weighted rules-based classifier with full explainability
 */

import {
  EntityRecord,
  FeatureVector,
  MatchDecision,
  MatchOutcome,
  FeatureContribution,
} from '../domain/EntityRecord.js';
import { buildFeatureVector } from '../features/extraction.js';

/**
 * Classifier configuration
 */
export interface ClassifierConfig {
  /** Feature weights (must sum to <= 1.0 for normalized scoring) */
  featureWeights: {
    nameSimilarity?: number;
    emailSimilarity?: number;
    orgSimilarity?: number;
    geoProximityKm?: number;
    temporalOverlapScore?: number;
    sharedIdentifiersCount?: number;
  };

  /** Threshold for MERGE recommendation */
  mergeThreshold: number;

  /** Threshold for NO_MATCH (below this = NO_MATCH, between = REVIEW) */
  reviewThreshold: number;
}

/**
 * Default configuration
 */
export const DEFAULT_CONFIG: ClassifierConfig = {
  featureWeights: {
    nameSimilarity: 0.3,
    emailSimilarity: 0.4,
    orgSimilarity: 0.1,
    temporalOverlapScore: 0.1,
    sharedIdentifiersCount: 0.1,
  },
  mergeThreshold: 0.8,
  reviewThreshold: 0.5,
};

/**
 * Score a feature vector and return contributions for explainability
 */
export function scoreMatch(
  fv: FeatureVector,
  cfg: ClassifierConfig = DEFAULT_CONFIG
): { score: number; contributions: FeatureContribution[] } {
  const contributions: FeatureContribution[] = [];
  let totalScore = 0;

  // Process each feature
  for (const [featureName, weight] of Object.entries(cfg.featureWeights)) {
    const rawValue = (fv as any)[featureName];

    // Skip if feature is missing
    if (rawValue === undefined || rawValue === null) {
      contributions.push({
        feature: featureName,
        value: null,
        weight: weight || 0,
        contribution: 0,
        rationale: `No ${formatFeatureName(featureName)} data available`,
      });
      continue;
    }

    // Normalize value to [0, 1]
    const normalizedValue = normalizeFeatureValue(featureName, rawValue);

    // Calculate contribution
    const contribution = normalizedValue * (weight || 0);
    totalScore += contribution;

    // Generate rationale
    const rationale = generateRationale(featureName, normalizedValue, rawValue);

    contributions.push({
      feature: featureName,
      value: rawValue,
      weight: weight || 0,
      contribution,
      rationale,
    });
  }

  return {
    score: Math.min(1.0, totalScore), // Cap at 1.0
    contributions,
  };
}

/**
 * Decide match outcome based on score and thresholds
 */
export function decideMatch(
  a: EntityRecord,
  b: EntityRecord,
  cfg: ClassifierConfig = DEFAULT_CONFIG,
  decidedBy: string = 'er-engine'
): MatchDecision {
  const fv = buildFeatureVector(a, b);
  const { score, contributions } = scoreMatch(fv, cfg);

  // Determine outcome
  let outcome: MatchOutcome;
  if (score >= cfg.mergeThreshold) {
    outcome = 'MERGE';
  } else if (score <= cfg.reviewThreshold) {
    outcome = 'NO_MATCH';
  } else {
    outcome = 'REVIEW';
  }

  // Generate summary
  const summary = generateSummary(outcome, contributions, score);

  return {
    recordIdA: a.id,
    recordIdB: b.id,
    matchScore: score,
    outcome,
    explanation: {
      summary,
      featureContributions: contributions,
    },
    decidedAt: new Date().toISOString(),
    decidedBy,
  };
}

/**
 * Normalize feature value to [0, 1] range
 */
function normalizeFeatureValue(featureName: string, value: number): number {
  switch (featureName) {
    case 'nameSimilarity':
    case 'emailSimilarity':
    case 'orgSimilarity':
    case 'temporalOverlapScore':
      // Already in [0, 1]
      return value;

    case 'geoProximityKm':
      // Inverse proximity: closer = higher score
      // Map 0km=1.0, 10km=0.5, 50km+=0.0
      if (value === 0) return 1.0;
      if (value >= 50) return 0.0;
      return Math.max(0, 1.0 - value / 50);

    case 'sharedIdentifiersCount':
      // Map 0=0.0, 1=0.5, 2+=1.0
      return Math.min(1.0, value / 2);

    default:
      return value;
  }
}

/**
 * Generate human-readable rationale for a feature contribution
 */
function generateRationale(featureName: string, normalizedValue: number, rawValue: number): string {
  switch (featureName) {
    case 'nameSimilarity':
      if (normalizedValue >= 0.95) return 'Exact or near-exact name match';
      if (normalizedValue >= 0.8) return 'High name similarity';
      if (normalizedValue >= 0.6) return 'Moderate name similarity';
      if (normalizedValue >= 0.4) return 'Low name similarity';
      return 'Very low name similarity';

    case 'emailSimilarity':
      if (normalizedValue === 1.0) return 'Exact email match';
      return 'Different email addresses';

    case 'orgSimilarity':
      if (normalizedValue >= 0.9) return 'Very similar organization names';
      if (normalizedValue >= 0.7) return 'Similar organization names';
      return 'Different organizations';

    case 'geoProximityKm':
      if (rawValue === 0) return 'Same location (0 km apart)';
      if (rawValue <= 10) return `Very close proximity (${rawValue.toFixed(1)} km apart)`;
      if (rawValue <= 50) return `Moderate proximity (${rawValue.toFixed(1)} km apart)`;
      return `Distant locations (${rawValue.toFixed(1)} km apart)`;

    case 'temporalOverlapScore':
      if (normalizedValue >= 0.8) return 'High temporal overlap in activity periods';
      if (normalizedValue >= 0.5) return 'Moderate temporal overlap';
      if (normalizedValue > 0) return 'Some temporal overlap';
      return 'No temporal overlap';

    case 'sharedIdentifiersCount':
      if (rawValue === 0) return 'No shared identifiers';
      if (rawValue === 1) return '1 shared identifier';
      return `${rawValue} shared identifiers`;

    default:
      return `Value: ${rawValue}`;
  }
}

/**
 * Generate summary explanation for the decision
 */
function generateSummary(
  outcome: MatchOutcome,
  contributions: FeatureContribution[],
  score: number
): string {
  // Find top 2 contributors
  const sorted = contributions
    .filter((c) => c.contribution > 0)
    .sort((a, b) => b.contribution - a.contribution);

  const top = sorted.slice(0, 2);

  const outcomeText =
    outcome === 'MERGE'
      ? 'MERGE recommended'
      : outcome === 'REVIEW'
      ? 'REVIEW suggested'
      : 'NO_MATCH determined';

  if (top.length === 0) {
    return `${outcomeText} (score: ${score.toFixed(2)}) with no strong signals`;
  }

  const signals = top
    .map((c) => c.rationale.toLowerCase())
    .join(' and ');

  return `${outcomeText} (score: ${score.toFixed(2)}) due to ${signals}`;
}

/**
 * Format feature name for display
 */
function formatFeatureName(name: string): string {
  return name
    .replace(/([A-Z])/g, ' $1')
    .toLowerCase()
    .trim();
}

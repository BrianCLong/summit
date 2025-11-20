import type { ERFeatures, ScoringConfig, CandidateScore, EntityRecord } from '../types.js';
import { extractFeatures } from '../core/features.js';

/**
 * Base scorer interface
 */
export interface Scorer {
  score(entityA: EntityRecord, entityB: EntityRecord): CandidateScore;
  getMethod(): string;
}

/**
 * Deterministic scorer using weighted feature combination
 */
export class DeterministicScorer implements Scorer {
  constructor(config: ScoringConfig) {}

  score(entityA: EntityRecord, entityB: EntityRecord): CandidateScore {
    const features = extractFeatures(entityA, entityB);
    const weights = this.config.weights;

    // Calculate weighted score
    let score = 0;
    score += features.nameSimilarity * weights.nameSimilarity;
    score += (features.typeMatch ? 1 : 0) * weights.typeMatch;
    score += features.propertyOverlap * weights.propertyOverlap;
    score += features.semanticSimilarity * weights.semanticSimilarity;
    score += features.geographicProximity * weights.geographicProximity;
    score += features.temporalCoOccurrence * weights.temporalCoOccurrence;
    score += features.deviceIdMatch * weights.deviceIdMatch;
    score += features.accountIdMatch * weights.accountIdMatch;

    // Normalize to 0-1
    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
    score = score / totalWeight;

    // Build rationale
    const rationale = this.buildRationale(features, weights);

    // Confidence is equal to score for deterministic
    const confidence = score;

    return {
      entityId: entityB.id,
      score: Number(score.toFixed(3)),
      confidence: Number(confidence.toFixed(3)),
      features,
      rationale,
      method: 'deterministic',
    };
  }

  getMethod(): string {
    return 'deterministic';
  }

  private buildRationale(features: ERFeatures): string[] {
    const rationale: string[] = [];

    if (features.nameSimilarity > 0.5) {
      rationale.push(`Name similarity: ${(features.nameSimilarity * 100).toFixed(1)}%`);
    }

    if (features.aliasSimilarity > 0.5) {
      rationale.push(`Alias match: ${(features.aliasSimilarity * 100).toFixed(1)}%`);
    }

    if (features.typeMatch) {
      rationale.push(`Type matches: ${features.typeMatch}`);
    }

    if (features.propertyOverlap > 0.3) {
      rationale.push(`Property overlap: ${(features.propertyOverlap * 100).toFixed(1)}%`);
    }

    if (features.semanticSimilarity > 0.3) {
      rationale.push(`Semantic match: ${(features.semanticSimilarity * 100).toFixed(1)}%`);
    }

    if (features.geographicProximity > 0.7) {
      rationale.push(`Geographic proximity: ${(features.geographicProximity * 100).toFixed(1)}%`);
    }

    if (features.deviceIdMatch > 0) {
      rationale.push(`Device ID match: ${(features.deviceIdMatch * 100).toFixed(1)}%`);
    }

    if (features.accountIdMatch > 0) {
      rationale.push(`Account ID match: ${(features.accountIdMatch * 100).toFixed(1)}%`);
    }

    if (features.phoneticSimilarity === 1) {
      rationale.push('Phonetic signature aligned');
    }

    return rationale;
  }
}

/**
 * Probabilistic scorer using Bayesian-inspired confidence estimation
 */
export class ProbabilisticScorer implements Scorer {
  constructor(config: ScoringConfig) {}

  score(entityA: EntityRecord, entityB: EntityRecord): CandidateScore {
    const features = extractFeatures(entityA, entityB);

    // Calculate base score using weights
    const baseScore = this.calculateBaseScore(features);

    // Calculate confidence using Bayesian-inspired approach
    const confidence = this.calculateConfidence(features);

    // Final score is baseScore adjusted by confidence
    const score = baseScore * confidence;

    const rationale = this.buildRationale(features, confidence);

    return {
      entityId: entityB.id,
      score: Number(score.toFixed(3)),
      confidence: Number(confidence.toFixed(3)),
      features,
      rationale,
      method: 'probabilistic',
    };
  }

  getMethod(): string {
    return 'probabilistic';
  }

  private calculateBaseScore(features: ERFeatures): number {
    const weights = this.config.weights;

    let score = 0;
    score += features.nameSimilarity * weights.nameSimilarity;
    score += (features.typeMatch ? 1 : 0) * weights.typeMatch;
    score += features.propertyOverlap * weights.propertyOverlap;
    score += features.semanticSimilarity * weights.semanticSimilarity;
    score += features.geographicProximity * weights.geographicProximity;
    score += features.temporalCoOccurrence * weights.temporalCoOccurrence;
    score += features.deviceIdMatch * weights.deviceIdMatch;
    score += features.accountIdMatch * weights.accountIdMatch;

    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
    return score / totalWeight;
  }

  private calculateConfidence(features: ERFeatures): number {
    // Confidence is based on number and strength of signals
    const signals: number[] = [];

    // Strong signals (high weight)
    if (features.nameSimilarity > 0.8) signals.push(1.0);
    else if (features.nameSimilarity > 0.6) signals.push(0.7);
    else if (features.nameSimilarity > 0.4) signals.push(0.4);

    if (features.typeMatch) signals.push(0.8);

    // Medium signals
    if (features.deviceIdMatch > 0.5) signals.push(0.9);
    if (features.accountIdMatch > 0.5) signals.push(0.7);
    if (features.geographicProximity > 0.8) signals.push(0.7);
    if (features.semanticSimilarity > 0.5) signals.push(0.6);

    // Weak signals
    if (features.propertyOverlap > 0.5) signals.push(0.5);
    if (features.temporalCoOccurrence > 0.5) signals.push(0.5);
    if (features.phoneticSimilarity === 1) signals.push(0.4);

    // Combine signals using noisy-OR model
    let confidence = 0;
    for (const signal of signals) {
      confidence = confidence + signal * (1 - confidence);
    }

    return confidence;
  }

  private buildRationale(features: ERFeatures, confidence: number): string[] {
    const rationale: string[] = [];

    rationale.push(`Confidence: ${(confidence * 100).toFixed(1)}%`);

    if (features.nameSimilarity > 0.5) {
      rationale.push(`Name similarity: ${(features.nameSimilarity * 100).toFixed(1)}%`);
    }

    if (features.deviceIdMatch > 0.5) {
      rationale.push(`Strong device ID match: ${(features.deviceIdMatch * 100).toFixed(1)}%`);
    }

    if (features.accountIdMatch > 0.5) {
      rationale.push(`Account ID match: ${(features.accountIdMatch * 100).toFixed(1)}%`);
    }

    if (features.geographicProximity > 0.7) {
      rationale.push(`High geographic proximity`);
    }

    if (features.semanticSimilarity > 0.5) {
      rationale.push(`Semantic attributes align`);
    }

    return rationale;
  }
}

/**
 * Hybrid scorer combining deterministic and probabilistic approaches
 */
export class HybridScorer implements Scorer {
  private deterministicScorer: DeterministicScorer;
  private probabilisticScorer: ProbabilisticScorer;

  constructor(config: ScoringConfig) {
    this.deterministicScorer = new DeterministicScorer(config);
    this.probabilisticScorer = new ProbabilisticScorer(config);
  }

  score(entityA: EntityRecord, entityB: EntityRecord): CandidateScore {
    const detScore = this.deterministicScorer.score(entityA, entityB);
    const probScore = this.probabilisticScorer.score(entityA, entityB);

    // Combine scores: weighted average
    // Use probabilistic confidence to weight the combination
    const weight = probScore.confidence;
    const combinedScore = (probScore.score * weight) + (detScore.score * (1 - weight));
    const combinedConfidence = (probScore.confidence + detScore.score) / 2;

    // Merge rationale from both methods
    const rationale = [
      ...new Set([...detScore.rationale, ...probScore.rationale]),
      `Hybrid score (det: ${detScore.score.toFixed(3)}, prob: ${probScore.score.toFixed(3)})`,
    ];

    return {
      entityId: entityB.id,
      score: Number(combinedScore.toFixed(3)),
      confidence: Number(combinedConfidence.toFixed(3)),
      features: detScore.features,
      rationale,
      method: 'hybrid',
    };
  }

  getMethod(): string {
    return 'hybrid';
  }
}

/**
 * Factory to create appropriate scorer based on method
 */
export function createScorer(config: ScoringConfig): Scorer {
  switch (config.method) {
    case 'deterministic':
      return new DeterministicScorer(config);
    case 'probabilistic':
      return new ProbabilisticScorer(config);
    case 'hybrid':
      return new HybridScorer(config);
    default:
      return new HybridScorer(config);
  }
}

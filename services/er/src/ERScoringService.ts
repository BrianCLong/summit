/**
 * ER Scoring Service
 * Feature extraction and weighted scoring for entity resolution
 */

import { ERFeatureScore, ERMatchScore } from '@summit/canonical-schema';

export interface ScoringRequest {
  entityAId: string;
  entityBId: string;
  features: ERFeatureScore[];
  method: 'deterministic' | 'probabilistic' | 'ml_supervised' | 'hybrid';
  modelVersion: string;
}

export class ERScoringService {
  /**
   * Compute weighted aggregate score from feature scores
   */
  computeWeightedScore(request: ScoringRequest): ERMatchScore {
    // Compute overall score as weighted sum
    const weightSum = request.features.reduce((sum, f) => sum + f.weight, 0);
    const overallScore = request.features.reduce(
      (sum, f) => sum + (f.score * f.weight),
      0
    ) / weightSum;

    // Compute confidence based on feature agreement
    const confidence = this.computeConfidence(request.features);

    // Compute risk score (inverse of confidence)
    const riskScore = 1.0 - confidence;

    return {
      candidateId: `${request.entityAId}-${request.entityBId}`,
      entityAId: request.entityAId,
      entityBId: request.entityBId,
      overallScore,
      method: request.method,
      features: request.features,
      confidence,
      riskScore,
      modelVersion: request.modelVersion,
      timestamp: new Date(),
    };
  }

  /**
   * Compute meta-confidence based on feature score variance
   * High variance = low confidence (features disagree)
   */
  private computeConfidence(features: ERFeatureScore[]): number {
    if (features.length === 0) {
      return 0;
    }

    // Calculate mean
    const mean = features.reduce((sum, f) => sum + f.score, 0) / features.length;

    // Calculate variance
    const variance = features.reduce(
      (sum, f) => sum + Math.pow(f.score - mean, 2),
      0
    ) / features.length;

    // Convert variance to confidence (low variance = high confidence)
    // Using exponential decay: confidence = e^(-variance)
    const confidence = Math.exp(-variance * 2);

    return confidence;
  }

  /**
   * Normalize feature scores to sum to 1.0
   */
  normalizeWeights(features: ERFeatureScore[]): ERFeatureScore[] {
    const totalWeight = features.reduce((sum, f) => sum + f.weight, 0);

    if (totalWeight === 0) {
      // Equal weights
      const equalWeight = 1.0 / features.length;
      return features.map(f => ({ ...f, weight: equalWeight }));
    }

    return features.map(f => ({
      ...f,
      weight: f.weight / totalWeight,
    }));
  }
}

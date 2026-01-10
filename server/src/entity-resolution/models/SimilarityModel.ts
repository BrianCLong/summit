import { EntityFeatures } from './FeatureExtractor.js';

export interface ExplanationFeature {
  name: string;
  value: number;
  weight: number;
}

export interface ModelPrediction {
  score: number;
  confidence: 'high' | 'medium' | 'low';
  features: ExplanationFeature[];
  explanation: string;
  suggestedAction: 'auto_merge' | 'review' | 'reject';
}

export interface SimilarityModel {
  predict(features: EntityFeatures): Promise<ModelPrediction>;
}

export class WeightedRuleBasedModel implements SimilarityModel {
  private weights: Record<string, number>;
  private thresholds: {
    autoMerge: number;
    review: number;
  };

  constructor(
    weights: Record<string, number> = {
      name_jaro_winkler: 0.2,
      name_soundex_match: 0.1,
      address_cosine: 0.2,
      phone_match: 0.25,
      email_match: 0.25
    },
    thresholds = { autoMerge: 0.9, review: 0.7 }
  ) {
    this.weights = weights;
    this.thresholds = thresholds;
  }

  public async predict(features: EntityFeatures): Promise<ModelPrediction> {
    let score = 0;
    let totalWeight = 0;
    const explanationFeatures: ExplanationFeature[] = [];

    // Simple weighted sum with normalization for missing features
    for (const [key, weight] of Object.entries(this.weights)) {
      const value = features[key];

      if (value !== null && value !== undefined) {
        score += value * weight;
        totalWeight += weight;
        explanationFeatures.push({ name: key, value, weight });
      } else {
        // Feature missing, do not count weight
        explanationFeatures.push({ name: key, value: 0, weight: 0 }); // Mark as irrelevant
      }
    }

    if (totalWeight > 0) {
      score = score / totalWeight;
    } else {
      score = 0;
    }

    // Cap at 1.0
    score = Math.min(score, 1.0);

    // Penalize for low information (if we only matched on a subset of features)
    // E.g., if we only have Name (0.4), we shouldn't be too confident even if it matches perfectly.
    // Assuming full weight sum is approx 1.0.
    const MIN_WEIGHT_FOR_HIGH_CONFIDENCE = 0.5;
    if (totalWeight < MIN_WEIGHT_FOR_HIGH_CONFIDENCE) {
        // Linearly scale down the score if we have less evidence than required
        score = score * (totalWeight / MIN_WEIGHT_FOR_HIGH_CONFIDENCE);
    }

    let confidence: 'high' | 'medium' | 'low' = 'low';
    let suggestedAction: 'auto_merge' | 'review' | 'reject' = 'reject';

    if (score >= this.thresholds.autoMerge) {
      confidence = 'high';
      suggestedAction = 'auto_merge';
    } else if (score >= this.thresholds.review) {
      confidence = 'medium';
      suggestedAction = 'review';
    }

    // Generate text explanation
    const topFactors = explanationFeatures
      .filter(f => f.weight > 0 && f.value > 0.5)
      .sort((a, b) => (b.value * b.weight) - (a.value * a.weight))
      .map(f => f.name);

    let explanation = `Score ${score.toFixed(2)} based on: ${topFactors.join(', ')}`;
    if (topFactors.length === 0) explanation = "No strong matches found.";

    return {
      score,
      confidence,
      features: explanationFeatures,
      explanation,
      suggestedAction
    };
  }
}

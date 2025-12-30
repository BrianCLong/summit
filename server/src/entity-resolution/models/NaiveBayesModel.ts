import { EntityFeatures } from './FeatureExtractor.js';
import { SimilarityModel, ModelPrediction, ExplanationFeature } from './SimilarityModel.js';

/**
 * A simplified Naive Bayes implementation for Entity Resolution.
 * It computes P(Match | Features) using Bayes' theorem.
 *
 * P(Match | F1, F2...) = P(Match) * P(F1|Match) * P(F2|Match) ...
 * -------------------------------------------------------------
 *                        P(F1, F2...)
 *
 * Where P(F1, F2...) is the total probability of evidence.
 *
 * Since we don't have a training set, we use "expert-defined" probabilities (priors and likelihoods).
 */
export class NaiveBayesModel implements SimilarityModel {
  // P(Match) - Prior probability that any two random candidates are a match.
  // In blocking scenarios, this is much higher than in the wild.
  private priorMatch = 0.01;

  // Likelihoods: P(Feature = Value | Match)
  // We simplify continuous features (0-1) into buckets or use them directly as probabilities if appropriate
  // but standard NB uses discrete features or distributions (Gaussian).
  // Here we'll treat high similarity scores as "evidence of match".

  // We define "Likelihood Ratios" for features.
  // P(Feature | Match) / P(Feature | Non-Match)
  // If Ratio > 1, feature supports Match. If < 1, supports Non-Match.

  // We will simply sum log-likelihood ratios (LLR) to get a score, which is monotonicity equivalent to probability.
  // Score = log(PriorOdds) + sum(log(P(F|M)/P(F|~M)))
  // Then convert back to probability: P = 1 / (1 + exp(-Score))

  private featureConfig: Record<string, { weight: number, threshold: number }> = {
    // We treat "weight" as roughly log(LikelihoodRatio) for a "good match" on this feature.
    // If feature value > threshold, we add the weight.
    // If feature is missing, we add 0.
    // If feature is low, we might subtract weight (penalty).

    email_match: { weight: 5.0, threshold: 0.9 },       // strong identifier
    phone_match: { weight: 4.0, threshold: 0.9 },       // strong identifier
    name_jaro_winkler: { weight: 2.0, threshold: 0.85 }, // good name match
    name_token_jaccard: { weight: 1.5, threshold: 0.7 }, // loose name match
    date_similarity: { weight: 2.0, threshold: 0.99 },   // same DOB
    address_cosine: { weight: 1.5, threshold: 0.8 },     // same address
    name_soundex_match: { weight: 0.5, threshold: 0.9 }, // phonetic match (weak alone)
  };

  private thresholds: {
    autoMerge: number;
    review: number;
  };

  constructor(thresholds = { autoMerge: 0.95, review: 0.70 }) {
    this.thresholds = thresholds;
  }

  public async predict(features: EntityFeatures): Promise<ModelPrediction> {
    // Start with Prior Log Odds
    // Odds = P / (1-P). If P=0.01, Odds ~ 0.01. LogOdds ~ -4.6
    let logOdds = Math.log(this.priorMatch / (1 - this.priorMatch));

    const explanationFeatures: ExplanationFeature[] = [];

    for (const [key, config] of Object.entries(this.featureConfig)) {
      const value = features[key];

      if (value === null || value === undefined) {
         explanationFeatures.push({ name: key, value: 0, weight: 0 });
         continue;
      }

      // Continuous feature logic:
      // If value is high (near 1), it supports match strongly.
      // If value is low (near 0), it supports non-match (or is neutral?).
      // For identifiers (email), mismatch is strong evidence against match (-Weight).

      let contribution = 0;

      if (value >= config.threshold) {
         // Strong match
         contribution = config.weight;
      } else if (value < 0.2) {
         // Mismatch - penalize
         // For things like email/phone, mismatch is very bad.
         if (key === 'email_match' || key === 'phone_match') {
             contribution = -2.0; // Not as strong as match is good, maybe?
             // Actually, different emails might mean different people, or just one person with 2 emails.
             // So mismatch isn't -infinity, but it's negative evidence if we expected a match.
             contribution = -0.5;
         } else if (key.startsWith('name')) {
             // Different names
             contribution = -1.0;
         }
      } else {
         // Gray area
         contribution = 0;
      }

      logOdds += contribution;
      explanationFeatures.push({ name: key, value, weight: contribution });
    }

    // Convert Log Odds to Probability
    // P = 1 / (1 + e^-LogOdds)
    const probability = 1 / (1 + Math.exp(-logOdds));

    let confidence: 'high' | 'medium' | 'low' = 'low';
    let suggestedAction: 'auto_merge' | 'review' | 'reject' = 'reject';

    if (probability >= this.thresholds.autoMerge) {
      confidence = 'high';
      suggestedAction = 'auto_merge';
    } else if (probability >= this.thresholds.review) {
      confidence = 'medium';
      suggestedAction = 'review';
    }

    // Generate explanation
    const topFactors = explanationFeatures
      .filter(f => Math.abs(f.weight) > 0.1)
      .sort((a, b) => b.weight - a.weight) // positive first
      .map(f => `${f.name} (${f.weight > 0 ? '+' : ''}${f.weight.toFixed(1)})`);

    let explanation = `Prob ${probability.toFixed(3)} (LogOdds ${logOdds.toFixed(1)}). Factors: ${topFactors.join(', ')}`;
    if (topFactors.length === 0) {explanation = "No strong evidence.";}

    return {
      score: probability,
      confidence,
      features: explanationFeatures,
      explanation,
      suggestedAction
    };
  }
}

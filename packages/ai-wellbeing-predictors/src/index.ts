/**
 * @intelgraph/ai-wellbeing-predictors
 *
 * AI-driven prediction tools for proactive citizen wellbeing forecasting
 * Integrates health, economic, educational, and behavioral data to:
 * - Forecast citizen needs and identify at-risk populations
 * - Generate early intervention recommendations
 * - Optimize resource allocation for maximum impact
 * - Enable continuous improvements in life quality
 */

// Core prediction engine
import { WellbeingPredictor } from './WellbeingPredictor.js';
export { WellbeingPredictor };

// Intervention recommendation system
import { InterventionRecommender } from './InterventionRecommender.js';
export { InterventionRecommender };

// Resource allocation optimizer
import { ResourceAllocator } from './ResourceAllocator.js';
export { ResourceAllocator };

// Type exports
export type {
  HealthData,
  EconomicData,
  EducationalData,
  BehavioralData,
  CitizenWellbeingProfile,
  WellbeingDomain,
  RiskLevel,
  InterventionType,
  WellbeingPrediction,
  InterventionRecommendation,
  ResourceAllocation,
  CohortAnalysis,
  ContributingFactor,
  ResourceRequirements,
  DomainAllocation,
  TopRiskFactor,
  HistoricalScore,
} from './types.js';

export { isValidWellbeingDomain, isValidRiskLevel } from './types.js';

/**
 * Create a complete wellbeing prediction pipeline
 */
export function createWellbeingPipeline(config?: {
  domainWeights?: Partial<Record<string, number>>;
  interventionValidityDays?: number;
  allocationReservePercent?: number;
}) {
  return {
    predictor: new WellbeingPredictor(config?.domainWeights),
    recommender: new InterventionRecommender(config?.interventionValidityDays),
    allocator: new ResourceAllocator({
      reservePercent: config?.allocationReservePercent,
    }),
  };
}

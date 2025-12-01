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
export { WellbeingPredictor } from './WellbeingPredictor.js';

// Intervention recommendation system
export { InterventionRecommender } from './InterventionRecommender.js';

// Resource allocation optimizer
export { ResourceAllocator } from './ResourceAllocator.js';

// Type exports
export {
  // Data schemas
  HealthDataSchema,
  EconomicDataSchema,
  EducationalDataSchema,
  BehavioralDataSchema,
  CitizenWellbeingProfileSchema,
  // Prediction schemas
  WellbeingPredictionSchema,
  InterventionRecommendationSchema,
  ResourceAllocationSchema,
  CohortAnalysisSchema,
  // Enum schemas
  WellbeingDomainSchema,
  RiskLevelSchema,
  InterventionTypeSchema,
  // Types
  type HealthData,
  type EconomicData,
  type EducationalData,
  type BehavioralData,
  type CitizenWellbeingProfile,
  type WellbeingDomain,
  type RiskLevel,
  type InterventionType,
  type WellbeingPrediction,
  type InterventionRecommendation,
  type ResourceAllocation,
  type CohortAnalysis,
} from './types.js';

/**
 * Create a complete wellbeing prediction pipeline
 */
export function createWellbeingPipeline(config?: {
  domainWeights?: Partial<Record<string, number>>;
  interventionValidityDays?: number;
  allocationReservePercent?: number;
}) {
  const { WellbeingPredictor } = require('./WellbeingPredictor.js');
  const { InterventionRecommender } = require('./InterventionRecommender.js');
  const { ResourceAllocator } = require('./ResourceAllocator.js');

  return {
    predictor: new WellbeingPredictor(config?.domainWeights),
    recommender: new InterventionRecommender(config?.interventionValidityDays),
    allocator: new ResourceAllocator({
      reservePercent: config?.allocationReservePercent,
    }),
  };
}

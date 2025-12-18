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

// Import classes for pipeline factory
import { WellbeingPredictor } from './WellbeingPredictor.js';
import { InterventionRecommender } from './InterventionRecommender.js';
import { ResourceAllocator } from './ResourceAllocator.js';

/**
 * Configuration options for creating a wellbeing prediction pipeline.
 */
export interface WellbeingPipelineConfig {
  /** Custom weights for wellbeing domains (0-1 scale) */
  domainWeights?: Partial<Record<string, number>>;
  /** Number of days intervention recommendations remain valid */
  interventionValidityDays?: number;
  /** Percentage of budget to hold in reserve (0-1 scale, default 0.10) */
  allocationReservePercent?: number;
}

/**
 * A complete wellbeing prediction pipeline containing predictor, recommender, and allocator.
 */
export interface WellbeingPipeline {
  /** Generates wellbeing predictions for citizen profiles */
  predictor: WellbeingPredictor;
  /** Recommends interventions based on predictions */
  recommender: InterventionRecommender;
  /** Optimizes resource allocation across wellbeing domains */
  allocator: ResourceAllocator;
}

/**
 * Create a complete wellbeing prediction pipeline with optional configuration.
 *
 * @example
 * ```typescript
 * import { createWellbeingPipeline } from '@intelgraph/ai-wellbeing-predictors';
 *
 * const pipeline = createWellbeingPipeline({
 *   allocationReservePercent: 0.15,
 * });
 *
 * const predictions = pipeline.predictor.predictBatch(profiles);
 * const allocation = pipeline.allocator.allocate(predictions, budget, region);
 * ```
 */
export function createWellbeingPipeline(config?: WellbeingPipelineConfig): WellbeingPipeline {
  return {
    predictor: new WellbeingPredictor(config?.domainWeights),
    recommender: new InterventionRecommender(config?.interventionValidityDays),
    allocator: new ResourceAllocator({
      reservePercent: config?.allocationReservePercent,
    }),
  };
}

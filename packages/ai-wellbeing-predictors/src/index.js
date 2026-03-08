"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.InterventionTypeSchema = exports.RiskLevelSchema = exports.WellbeingDomainSchema = exports.CohortAnalysisSchema = exports.ResourceAllocationSchema = exports.InterventionRecommendationSchema = exports.WellbeingPredictionSchema = exports.CitizenWellbeingProfileSchema = exports.BehavioralDataSchema = exports.EducationalDataSchema = exports.EconomicDataSchema = exports.HealthDataSchema = exports.ResourceAllocator = exports.InterventionRecommender = exports.WellbeingPredictor = void 0;
exports.createWellbeingPipeline = createWellbeingPipeline;
// Core prediction engine
var WellbeingPredictor_js_1 = require("./WellbeingPredictor.js");
Object.defineProperty(exports, "WellbeingPredictor", { enumerable: true, get: function () { return WellbeingPredictor_js_1.WellbeingPredictor; } });
// Intervention recommendation system
var InterventionRecommender_js_1 = require("./InterventionRecommender.js");
Object.defineProperty(exports, "InterventionRecommender", { enumerable: true, get: function () { return InterventionRecommender_js_1.InterventionRecommender; } });
// Resource allocation optimizer
var ResourceAllocator_js_1 = require("./ResourceAllocator.js");
Object.defineProperty(exports, "ResourceAllocator", { enumerable: true, get: function () { return ResourceAllocator_js_1.ResourceAllocator; } });
// Type exports
var types_js_1 = require("./types.js");
// Data schemas
Object.defineProperty(exports, "HealthDataSchema", { enumerable: true, get: function () { return types_js_1.HealthDataSchema; } });
Object.defineProperty(exports, "EconomicDataSchema", { enumerable: true, get: function () { return types_js_1.EconomicDataSchema; } });
Object.defineProperty(exports, "EducationalDataSchema", { enumerable: true, get: function () { return types_js_1.EducationalDataSchema; } });
Object.defineProperty(exports, "BehavioralDataSchema", { enumerable: true, get: function () { return types_js_1.BehavioralDataSchema; } });
Object.defineProperty(exports, "CitizenWellbeingProfileSchema", { enumerable: true, get: function () { return types_js_1.CitizenWellbeingProfileSchema; } });
// Prediction schemas
Object.defineProperty(exports, "WellbeingPredictionSchema", { enumerable: true, get: function () { return types_js_1.WellbeingPredictionSchema; } });
Object.defineProperty(exports, "InterventionRecommendationSchema", { enumerable: true, get: function () { return types_js_1.InterventionRecommendationSchema; } });
Object.defineProperty(exports, "ResourceAllocationSchema", { enumerable: true, get: function () { return types_js_1.ResourceAllocationSchema; } });
Object.defineProperty(exports, "CohortAnalysisSchema", { enumerable: true, get: function () { return types_js_1.CohortAnalysisSchema; } });
// Enum schemas
Object.defineProperty(exports, "WellbeingDomainSchema", { enumerable: true, get: function () { return types_js_1.WellbeingDomainSchema; } });
Object.defineProperty(exports, "RiskLevelSchema", { enumerable: true, get: function () { return types_js_1.RiskLevelSchema; } });
Object.defineProperty(exports, "InterventionTypeSchema", { enumerable: true, get: function () { return types_js_1.InterventionTypeSchema; } });
// Import classes for pipeline factory
const WellbeingPredictor_js_2 = require("./WellbeingPredictor.js");
const InterventionRecommender_js_2 = require("./InterventionRecommender.js");
const ResourceAllocator_js_2 = require("./ResourceAllocator.js");
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
function createWellbeingPipeline(config) {
    return {
        predictor: new WellbeingPredictor_js_2.WellbeingPredictor(config?.domainWeights),
        recommender: new InterventionRecommender_js_2.InterventionRecommender(config?.interventionValidityDays),
        allocator: new ResourceAllocator_js_2.ResourceAllocator({
            reservePercent: config?.allocationReservePercent,
        }),
    };
}

/**
 * NL Graph Query Copilot - Public API
 */

export {
  NlGraphQueryService,
  getNlGraphQueryService,
  shutdownNlGraphQueryService,
} from './nl-graph-query.service.js';

export type {
  CompileRequest,
  CompileResponse,
  CompileError,
  SchemaContext,
  CostEstimate,
  QueryPattern,
  ValidationResult,
} from './types.js';

export {
  queryPatterns,
  findMatchingPattern,
  generateFromPattern,
} from './query-patterns.js';

export {
  estimateQueryCost,
  isSafeToExecute,
  generateCostWarnings,
} from './cost-estimator.js';

export {
  validateCypher,
  extractRequiredParameters,
  isReadOnlyQuery,
} from './validator.js';

export {
  explainQuery,
  summarizeQuery,
} from './explainer.js';

// Metrics exports for monitoring
export {
  nlQueryCompilationsTotal,
  nlQueryCompilationLatencySeconds,
  nlQueryCostEstimateNodes,
  nlQueryCostEstimateEdges,
  nlQueryCacheSize,
  nlQueryCacheHits,
  nlQueryCacheMisses,
  nlQueryPatternMatches,
  nlQueryValidationErrors,
  nlQuerySafetyBlocks,
  nlQueryWarnings,
  recordCompilationSuccess,
  recordCompilationError,
  recordCacheHit,
  recordCacheMiss,
  updateCacheSize,
  recordSafetyBlock,
  recordWarning,
} from './metrics.js';

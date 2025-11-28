/**
 * Collective Intelligence Future Weaving Service
 * Entry point for the service
 */

export { FutureWeaver, createFutureWeaver } from './FutureWeaver.js';
export type { WeaverConfig, WeaveRequest } from './FutureWeaver.js';

// Models
export {
  IntelligenceSource,
  IntelligenceSourceFactory,
  SourceType,
  getSourceWeight,
  isSourceActive,
} from './models/IntelligenceSource.js';
export type { RegisterSourceInput } from './models/IntelligenceSource.js';

export {
  PredictiveSignal,
  PredictiveSignalFactory,
  groupSignalsByDomain,
  calculateConsensus,
  getWeightedPrediction,
} from './models/PredictiveSignal.js';
export type { SubmitSignalInput, SignalGroup } from './models/PredictiveSignal.js';

export {
  SignalBraid,
  SignalBraidFactory,
  ResolutionMethod,
  isCoherent,
  hasUnresolvedConflicts,
} from './models/SignalBraid.js';
export type { TemporalSpan, ConflictResolution } from './models/SignalBraid.js';

export {
  FutureFabric,
  FutureFabricFactory,
  getHighestConfidencePrediction,
  getDomainConfidence,
} from './models/FutureFabric.js';
export type { DivergenceZone } from './models/FutureFabric.js';

export {
  TrustScore,
  TrustScoreFactory,
  getTrustLevel,
  shouldIncludeSource,
} from './models/TrustScore.js';
export type { TrustEvent, TrustConfig } from './models/TrustScore.js';

// Algorithms
export {
  SignalFuser,
  FusionMethod,
  createFuser,
} from './algorithms/SignalFuser.js';
export type { FusionResult, FusionConfig } from './algorithms/SignalFuser.js';

export {
  ConflictResolver,
  createConflictResolver,
} from './algorithms/ConflictResolver.js';
export type {
  ConflictDetectionResult,
  ConflictResolverConfig,
} from './algorithms/ConflictResolver.js';

export {
  TrustCalculator,
  createTrustCalculator,
} from './algorithms/TrustCalculator.js';
export type {
  TrustCalculatorConfig,
  PredictionVerification,
} from './algorithms/TrustCalculator.js';

export {
  FabricHarmonizer,
  createHarmonizer,
  mergeFabrics,
} from './algorithms/FabricHarmonizer.js';
export type {
  HarmonizerConfig,
  HarmonizationResult,
} from './algorithms/FabricHarmonizer.js';

// Resolvers
export { weavingResolvers } from './resolvers/weavingResolvers.js';

// Utils
export { createLogger } from './utils/logger.js';
export type { Logger, LogLevel } from './utils/logger.js';

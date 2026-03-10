/**
 * Repository Archaeology Engine
 *
 * Complete capability resurrection system with provenance tracking
 *
 * @module archaeology
 */

// Fragment Extractor
export {
  FragmentExtractor,
  CodeFragment,
  SymbolInfo,
  ExtractionOptions,
  ExtractionResult
} from './fragment-extractor';

// Subsystem Inference
export {
  SubsystemInferenceEngine,
  Subsystem,
  SubsystemCategory,
  InferenceOptions,
  InferenceResult
} from './subsystem-inference';

// Partial Deletion Detector
export {
  PartialDeletionDetector,
  DeletionCandidate,
  ResurrectionPriority,
  ResurrectionFeasibility,
  ResurrectionEffort,
  ResurrectionRecommendation,
  DetectionOptions,
  DetectionResult
} from './partial-deletion-detector';

// Reconstruction Engine
export {
  ReconstructionEngine,
  ReconstructionBundle,
  SynthesisStrategy,
  ReconstructionOptions,
  ReconstructionResult
} from './reconstruction-engine';

// Capability Graph
export {
  CapabilityGraphBuilder,
  CapabilityGraph,
  CapabilityNode,
  CapabilityEdge,
  NodeType,
  EdgeRelation,
  QueryType,
  GraphQuery,
  QueryResult
} from './capability-graph';

// Evolution Integration
export {
  EvolutionIntegration,
  createEvolutionIntegration,
  EvolutionEvent,
  EvolutionEventType,
  HomeostasisSignal,
  HomeostasisSignalType,
  EvolutionIntegrationOptions
} from './evolution-integration';

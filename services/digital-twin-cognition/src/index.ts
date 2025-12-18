/**
 * Digital Twin Cognition Layer
 *
 * A next-generation cognitive system for digital twins that provides:
 * - Self-learning, multi-modal perception
 * - Multi-paradigm reasoning (causal, probabilistic, counterfactual)
 * - Multi-agent cognition with specialized agents
 * - Real-time decision & control co-pilot
 * - Explainable, governed decisions
 * - Continual learning and adaptation
 *
 * @module @intelgraph/digital-twin-cognition
 */

// Core components
export { CognitionEngine } from './core/CognitionEngine.js';
export type { CognitionEngineConfig } from './core/CognitionEngine.js';

export { TwinCognitionOrchestrator } from './core/TwinCognitionOrchestrator.js';
export type {
  OrchestratorConfig,
  CognitionCycleResult,
  TwinCognitionStatus,
} from './core/TwinCognitionOrchestrator.js';

// Perception
export { MultiModalPerceptionEngine } from './perception/MultiModalPerceptionEngine.js';
export type {
  PerceptionConfig,
  PerceptionOutput,
  SensorFeatures,
  TextFeatures,
  ImageFeatures,
  DocumentFeatures,
  FusedRepresentation,
} from './perception/MultiModalPerceptionEngine.js';

// Learning
export { ContinualLearningSystem } from './learning/ContinualLearningSystem.js';
export type {
  LearningConfig,
  LearningState,
  Experience,
  DriftDetection,
  PolicyExperiment,
  KnowledgeUpdate,
} from './learning/ContinualLearningSystem.js';

// Agents
export {
  DiagnosticsAgent,
  OptimizationAgent,
  ComplianceAgent,
  OperationsAgent,
  AgentOrchestrator,
  BaseAgent,
} from './agents/SpecializedAgents.js';
export type {
  AgentConfig,
  AgentResult,
  Finding,
  Recommendation,
  Evidence,
  Impact,
} from './agents/SpecializedAgents.js';

// Governance
export { GovernanceEngine } from './governance/GovernanceEngine.js';
export type {
  GovernanceConfig,
  PolicyEvaluationResult,
  AuditLog,
} from './governance/GovernanceEngine.js';

// Explainability
export { ExplainabilityEngine } from './explainability/ExplainabilityEngine.js';
export type {
  ExplanationConfig,
  Explanation,
  BecauseChain,
  Counterfactual,
  FeatureAttribution,
  CausalGraph,
  NaturalLanguageExplanation,
} from './explainability/ExplainabilityEngine.js';

// Types
export * from './types/index.js';

// Factory function for quick setup
export function createTwinCognition(
  config?: Partial<import('./core/TwinCognitionOrchestrator.js').OrchestratorConfig>,
): TwinCognitionOrchestrator {
  return new TwinCognitionOrchestrator(config);
}

// Default export
export { TwinCognitionOrchestrator as default } from './core/TwinCognitionOrchestrator.js';

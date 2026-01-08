/**
 * @intelgraph/platform-governance
 *
 * Policy engine and governance utilities for Summit platform.
 * Implements Prompts 46-49: Policy Engine, Platform Abstractions, Documentation QA, Ownership Matrix
 *
 * Features:
 * - Rule-based policy evaluation
 * - Service and code ownership tracking
 * - CODEOWNERS generation
 * - Coverage validation
 */

// Policy exports
export * from "./policy/engine.js";

// Ownership exports
export * from "./ownership/matrix.js";

// Record framework exports
export * from "./records/framework.js";

// Retention engine exports
export * from "./retention/engine.js";

// Re-export commonly used items
export { PolicyEngine, createPolicyEngine, policyEngine } from "./policy/engine.js";

export {
  OwnershipMatrixManager,
  createOwnershipManager,
  ownershipMatrix,
} from "./ownership/matrix.js";

export type {
  Policy,
  PolicyRule,
  Condition,
  EvaluationContext,
  EvaluationResult,
  RuleType,
  PolicyEffect,
  ConditionOperator,
} from "./policy/engine.js";

export type {
  Owner,
  OwnerType,
  OwnerContact,
  OwnershipEntry,
  OwnershipMatrix,
  EscalationLevel,
} from "./ownership/matrix.js";

export {
  canonicalModules,
  canonicalFeatures,
  canonicalNouns,
  boundedContexts,
  domainVocabulary,
  resolveSystemOfRecord,
  validateIdentifiers,
} from "./suite/domain.js";

export type {
  CanonicalFeature,
  CanonicalModule,
  CanonicalNoun,
  BoundedContext,
  DomainVocabulary,
  SystemOfRecord,
  GlossaryMapping,
  Identifiers,
} from "./suite/domain.js";

export {
  apiContractSchema,
  cloudEventSchema,
  compareCloudEvents,
  ensureIdempotentWrite,
  isApiContractCompatible,
  validateApiContract,
  validateEventContract,
  ContractRegistry,
  requireCanonicalModule,
} from "./suite/contracts.js";

export type {
  ApiContract,
  ApiStyle,
  CloudEventContract,
  CompatibilityReport,
  EventCompatibilityResult,
  ContractRegistryEntry,
} from "./suite/contracts.js";

export {
  enforceAcyclicDependencies,
  discoverWorkspacePackages,
  detectCircularDependencies,
  buildDependencyGraph,
} from "./suite/dependency-map.js";

export type {
  DependencyGraph,
  DependencyEdge,
  DependencyPolicyResult,
  CycleReport,
} from "./suite/dependency-map.js";

export {
  evaluateEntitlement,
  calculateProratedCredit,
  detectUsageAnomalies,
  entitlementSchema,
  usageRecordSchema,
} from "./suite/entitlements.js";

export type {
  Entitlement,
  EntitlementEvaluation,
  UsageRecord,
  ProrationInput,
  Anomaly,
} from "./suite/entitlements.js";

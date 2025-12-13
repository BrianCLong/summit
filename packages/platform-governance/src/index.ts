/**
 * @summit/platform-governance
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
export * from './policy/engine.js';

// Ownership exports
export * from './ownership/matrix.js';

// Re-export commonly used items
export {
  PolicyEngine,
  createPolicyEngine,
  policyEngine,
} from './policy/engine.js';

export {
  OwnershipMatrixManager,
  createOwnershipManager,
  ownershipMatrix,
} from './ownership/matrix.js';

export type {
  Policy,
  PolicyRule,
  Condition,
  EvaluationContext,
  EvaluationResult,
  RuleType,
  PolicyEffect,
  ConditionOperator,
} from './policy/engine.js';

export type {
  Owner,
  OwnerType,
  OwnerContact,
  OwnershipEntry,
  OwnershipMatrix,
  EscalationLevel,
} from './ownership/matrix.js';

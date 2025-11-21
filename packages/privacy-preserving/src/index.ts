/**
 * @intelgraph/privacy-preserving
 * Privacy-preserving data synthesis and validation
 */

// Export shared types
export * from './types';

// Export differential privacy
export {
  DifferentialPrivacy,
  PrivacyBudgetManager,
  type DPConfig,
  type PrivacyBudget,
  type BudgetAllocation
} from './differential-privacy/DifferentialPrivacy';

// Export k-anonymity
export {
  KAnonymity,
  type AnonymizationConfig,
  type AnonymizationResult,
  type AnonymizationMetrics,
  type EquivalenceClass
} from './anonymization/KAnonymity';

// Export privacy validation
export {
  PrivacyValidator,
  type PrivacyAssessment,
  type ComplianceCheck,
  type ReidentificationRisk
} from './validation/PrivacyValidator';

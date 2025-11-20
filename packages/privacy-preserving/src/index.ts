/**
 * @intelgraph/privacy-preserving
 * Privacy-preserving data synthesis and validation
 */

export {
  DifferentialPrivacy,
  PrivacyBudgetManager,
  type DPConfig,
  type PrivacyBudget,
  type BudgetAllocation
} from './differential-privacy/DifferentialPrivacy';

export {
  KAnonymity,
  type AnonymizationConfig,
  type AnonymizationResult,
  type AnonymizationMetrics,
  type EquivalenceClass
} from './anonymization/KAnonymity';

export {
  PrivacyValidator,
  type PrivacyAssessment,
  type ComplianceCheck,
  type ReidentificationRisk
} from './validation/PrivacyValidator';

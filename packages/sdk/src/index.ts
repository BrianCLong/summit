/**
 * Summit SDK
 *
 * Official SDK for the Summit Platform API.
 * Provides typed clients for all platform services.
 *
 * @example
 * ```typescript
 * import { createSummitSDK } from '@summit/sdk';
 *
 * const sdk = createSummitSDK({
 *   baseUrl: 'https://api.summit.example.com',
 *   apiKey: 'your-api-key',
 * });
 *
 * // Check if action is allowed
 * const allowed = await sdk.policy.isAllowed('user-123', 'doc-456', 'read');
 *
 * // Get compliance summary
 * const summary = await sdk.compliance.getSummary();
 * ```
 *
 * @module @summit/sdk
 */

// Client exports
export {
  // Main client
  SummitClient,
  createSummitClient,
  type SummitClientConfig,
  type AuthMethod,
  type RequestOptions,
  type ApiResponse,
  type PaginatedResponse,
  type SummitClientEvents,
  // Policy client
  PolicyClient,
  type PolicyStatus,
  type PolicyEffect,
  type Policy,
  type PolicyRule,
  type PolicyCondition,
  type EvaluationRequest,
  type EvaluationResult,
  type SimulationRequest,
  type SimulationResult,
  type PolicyVersion,
  type CreatePolicyRequest,
  type UpdatePolicyRequest,
  type ListPoliciesOptions,
  // Compliance client
  ComplianceClient,
  type ComplianceFramework,
  type ControlStatus,
  type AssessmentStatus,
  type ComplianceControl,
  type Evidence,
  type Assessment,
  type AssessmentFinding,
  type ComplianceReport,
  type ReportSection,
  type GapAnalysis,
  type RemediationPlan,
  type RemediationStep,
  type ListControlsOptions,
  type CreateEvidenceRequest,
  type StartAssessmentRequest,
  type GenerateReportRequest,
  // SDK factory
  type SummitSDK,
  createSummitSDK,
} from "./client/index.js";

// Generated API client exports
export * from "./generated/index.js";

// Governance helpers
export {
  ReceiptsClient,
  type ProvenanceReceipt,
  type ReceiptStatus,
  type ReceiptSubmissionResponse,
} from "./receipts.js";

export {
  PolicyDecisionsClient,
  type PolicyDecision,
  type PolicyDecisionRequest,
} from "./policyDecisions.js";

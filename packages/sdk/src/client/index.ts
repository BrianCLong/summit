/**
 * Summit SDK Client Module
 *
 * Exports all client classes and types for interacting with
 * the Summit Platform API.
 *
 * @module @summit/sdk/client
 */

// Main client
export {
  SummitClient,
  createSummitClient,
  type SummitClientConfig,
  type AuthMethod,
  type RequestOptions,
  type ApiResponse,
  type PaginatedResponse,
  type SummitClientEvents,
} from "./SummitClient.js";

// Policy client
export {
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
} from "./PolicyClient.js";

// Compliance client
export {
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
} from "./ComplianceClient.js";

// ============================================================================
// Convenience Factory
// ============================================================================

import { SummitClient, SummitClientConfig } from "./SummitClient.js";
import { PolicyClient } from "./PolicyClient.js";
import { ComplianceClient } from "./ComplianceClient.js";

/**
 * Summit SDK with all clients
 */
export interface SummitSDK {
  client: SummitClient;
  policy: PolicyClient;
  compliance: ComplianceClient;
}

/**
 * Create Summit SDK with all clients
 */
export function createSummitSDK(config: SummitClientConfig): SummitSDK {
  const client = new SummitClient(config);
  return {
    client,
    policy: new PolicyClient(client),
    compliance: new ComplianceClient(client),
  };
}

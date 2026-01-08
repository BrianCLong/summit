export interface Obligation {
  /**
   * Obligation type identifier, e.g. `dual_control` or `audit`.
   */
  type: string;
  /**
   * Optional short code that can be used for UI or policy reporting.
   */
  code?: string;
  /**
   * Human-readable description of the obligation.
   */
  description?: string;
  /**
   * Number of distinct approvers required for the action.
   */
  requiredApprovers?: number;
  /**
   * Approver identifiers that have been collected so far.
   */
  approverIds?: string[];
  /**
   * Whether the obligation has been satisfied.
   */
  satisfied?: boolean;
  /**
   * Arbitrary metadata needed to satisfy the obligation.
   */
  metadata?: Record<string, unknown>;
}
export interface PreflightRequest {
  /**
   * Action identifier (e.g. DELETE_CASE, EXPORT_GRAPH).
   */
  action: string;
  /**
   * Actor performing the action.
   */
  actor: {
    id: string;
    role?: string;
    tenantId?: string;
  };
  /**
   * Optional resource information.
   */
  resource?: {
    id?: string;
    type?: string;
    fingerprint?: string;
    attributes?: Record<string, unknown>;
  };
  /**
   * Payload that will be executed alongside the action.
   */
  payload?: Record<string, unknown>;
  /**
   * Approvers collected for dual-control operations.
   */
  approvers?: string[];
  /**
   * Additional context such as correlation IDs or cached request hashes.
   */
  context?: {
    correlationId?: string;
    requestHash?: string;
  };
}
export interface PolicyDecision {
  /**
   * Whether the action is allowed to proceed.
   */
  allow: boolean;
  /**
   * Rationale for the allow/deny decision.
   */
  reason?: string;
  /**
   * Obligations that must be met (e.g. dual control).
   */
  obligations?: Obligation[];
  /**
   * Policy version used for the decision.
   */
  policyVersion?: string;
  /**
   * Unique identifier for the policy decision/preflight run.
   */
  decisionId?: string;
  /**
   * Optional expiry for the decision.
   */
  expiresAt?: string;
}

export interface Obligation {
  type: string;
  code?: string;
  description?: string;
  requiredApprovers?: number;
  approverIds?: string[];
  satisfied?: boolean;
  metadata?: Record<string, unknown>;
}

export interface PreflightRequest {
  action: string;
  actor: {
    id: string;
    role?: string;
    tenantId?: string;
  };
  resource?: {
    id?: string;
    type?: string;
    fingerprint?: string;
    attributes?: Record<string, unknown>;
  };
  payload?: Record<string, unknown>;
  approvers?: string[];
  context?: {
    correlationId?: string;
    requestHash?: string;
    policyVersion?: string;
    pinnedPolicyVersion?: string;
  };
}

export interface PolicyDecision {
  allow: boolean;
  reason?: string;
  obligations?: Obligation[];
  policyVersion?: string;
  decisionId?: string;
  expiresAt?: string;
}

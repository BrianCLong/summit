export type PolicyAction = 'ALLOW' | 'DENY' | 'ESCALATE';
export type Stage = 'data' | 'train' | 'alignment' | 'runtime';

export interface PolicyRule {
  field: string;
  operator: 'eq' | 'neq' | 'lt' | 'gt' | 'in' | 'not_in' | 'contains';
  value: any;
}

export interface Policy {
  id: string;
  description?: string;
  scope: {
    stages: Stage[];
    tenants: string[]; // "*" for all
  };
  rules: PolicyRule[];
  action: PolicyAction; // Action to take if rules match (or if rules FAIL? usually rules define violation)
  // Let's assume rules define "Allowed" conditions or "Blocked" conditions.
  // For simplicity: If ALL rules match, the policy applies.
  // Wait, usually policies are "Block if toxicity > 0.8".
  // So if rules match, we return the action (e.g., DENY).
}

export interface PolicyContext {
  stage: Stage;
  tenantId: string;
  region?: string;
  // Dynamic payload to check against rules
  payload: Record<string, any>;
}

export interface GovernanceDecision {
  action: PolicyAction;
  reasons: string[];
  policyIds: string[];
}

export interface TelemetryEvent {
  id: string;
  kind: string; // e.g., 'policy_violation', 'inference', 'training_step'
  runId: string;
  modelId?: string;
  tenantId?: string;
  timestamp: string;
  details: Record<string, any>;
  // For graph linking
  previousEventId?: string;
}

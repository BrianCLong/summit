export type PolicyAction = 'ALLOW' | 'DENY' | 'ESCALATE' | 'WARN';
export type Stage =
  | 'data'
  | 'train'
  | 'alignment'
  | 'runtime'
  | 'ingest'
  | 'retrieval'
  | 'tool_use'
  | 'output';

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
  action: PolicyAction;
}

export interface PolicyContext {
  stage: Stage;
  tenantId: string;
  region?: string;
  payload: Record<string, any>;
  metadata?: Record<string, any>;
  simulation?: boolean; // Request is a simulation
}

export interface GovernanceVerdict {
  action: PolicyAction;
  reasons: string[];
  policyIds: string[];
  metadata: {
    timestamp: string;
    evaluator: string;
    latencyMs: number;
    simulation: boolean;
  };
  provenance: {
    origin: string;
    confidence: number;
  };
}

// Backward compatibility alias
export type GovernanceDecision = GovernanceVerdict;

export interface TelemetryEvent {
  id: string;
  kind: string; // e.g., 'policy_violation', 'inference', 'training_step'
  runId: string;
  modelId?: string;
  tenantId?: string;
  timestamp: string;
  details: Record<string, any>;
  previousEventId?: string;
}

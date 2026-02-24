export interface Capability {
  id: string;
  name: string;
  version: string;
  description?: string;
}

export interface ToolCallRequest {
  traceId?: string;
  tenantId: string;
  actorId: string;
  capabilityId: string;
  inputs: Record<string, any>;
}

export interface ActionReceipt {
  receipt_id: string;
  trace_id: string;
  tenant_id: string;
  actor_id: string;
  requested_capability: string;
  selected_server_id: string | null;
  policy_decision_id: string;
  policy_reasons: string[];
  obligations: string[];
  credential_grant_id: string | null;
  inputs_hash: string;
  outputs_hash: string | null;
  timestamps: {
    created_at: string;
    [key: string]: string;
  };
}

export interface PolicyDecision {
  allowed: boolean;
  decisionId: string;
  reasons: string[];
  obligations: string[];
}

export interface CredentialGrant {
  grantId: string;
}

export enum RoutingOutcome {
  SUCCESS = 'SUCCESS',
  DENY = 'DENY',
  ERROR = 'ERROR'
}

export interface RoutingResponse {
  outcome: RoutingOutcome;
  receipt: ActionReceipt;
  error?: string;
}

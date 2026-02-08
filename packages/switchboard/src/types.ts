export interface Request {
  tenantId: string;
  actorId: string;
  capability: string;
  tool: string;
  params: Record<string, any>;
}

export interface CapabilityModel {
  capability: string;
  version: string;
  serverId: string;
}

export interface ControlPlaneReceipt {
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
  timestamp: string;
}

export type RoutingResult =
  | { success: true; receipt: ControlPlaneReceipt; result: any }
  | { success: false; receipt: ControlPlaneReceipt; error: string };

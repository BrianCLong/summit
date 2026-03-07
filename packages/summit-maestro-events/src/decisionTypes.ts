export type MaestroDecisionStatus =
  | "allow"
  | "allow_with_conditions"
  | "escalate"
  | "deny";

export interface PlaneContribution {
  plane: "epistemic" | "governance" | "memory" | string;
  status: "ok" | "concern" | "violation";
  details?: Record<string, unknown>;
  recommendation?: "allow" | "allow_with_conditions" | "escalate" | "deny";
}

export interface RequiredAction {
  kind:
    | "add_human_approval"
    | "add_evidence"
    | "log_incident"
    | "notify"
    | string;
  reason: string;
  [key: string]: unknown;
}

export interface MaestroDecision {
  decision_id: string;
  event_id: string;
  timestamp: string;
  tenant_id: string;
  status: MaestroDecisionStatus;
  risk_score?: number;
  planes: PlaneContribution[];
  required_actions: RequiredAction[];
  audit_ref?: string;
}

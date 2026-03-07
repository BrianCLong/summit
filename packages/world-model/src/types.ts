export type EntityState =
  | "unknown"
  | "open"
  | "in_progress"
  | "blocked"
  | "degraded"
  | "resolved"
  | "closed";

export interface EntitySnapshot {
  entity_id: string;
  type: string;
  current_state: EntityState;
  owner?: string;
  last_changed_by_event?: string;
  allowed_actions?: string[];
  policy_scope?: string[];
}

export interface WorldEvent {
  evidence_id: string;
  entity_id: string;
  event_type: string;
  observed_at: string;
  payload: Record<string, unknown>;
}

export interface Transition {
  from_state: string;
  to_state: string;
  event_type: string;
  conditions?: string[];
}

export interface ActionAffordance {
  action_name: string;
  required_roles?: string[];
  policy_checks?: string[];
}

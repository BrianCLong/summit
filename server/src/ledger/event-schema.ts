export type LedgerEventType =
  | "workflow.started"
  | "step.started"
  | "step.succeeded"
  | "step.failed"
  | "tool.called"
  | "tool.returned"
  | "retrieval.performed"
  | "policy.allowed"
  | "policy.denied"
  | "artifact.emitted"
  | "human.approved"
  | "workflow.completed";

export interface LedgerEvent {
  event_id: string;
  workflow_id: string;
  seq: number;
  type: LedgerEventType;
  step_id?: string;
  actor?: string;
  evidence_id: `LEDGER:${string}:${number}`;
  deterministic_time: string; // fixture/pinned in deterministic mode
  payload: Record<string, unknown>;
}

/**
 * TraceEnvelope — structured telemetry record emitted by the Flight Recorder.
 *
 * Never log fields that are marked sensitive (see NEVER_LOG_FIELDS).
 *
 * EVD-AFCP-ARCH-001
 */

export type TraceEventType =
  | "ROUTE_DECISION"
  | "POLICY_DECISION"
  | "TASK_STARTED"
  | "TASK_COMPLETED"
  | "TASK_FAILED"
  | "APPROVAL_REQUESTED"
  | "APPROVAL_GRANTED"
  | "APPROVAL_DENIED";

/** Fields that must never appear in telemetry output. */
export const NEVER_LOG_FIELDS = [
  "rawSecret",
  "token",
  "password",
  "customerPIIPayload",
  "approvalJustificationBody",
] as const;

export interface TraceEnvelope {
  /** Unique trace identifier. */
  traceId: string;

  /** The task this trace is associated with. */
  taskId: string;

  /** The agent involved (if applicable). */
  agentId?: string;

  /** Event type. */
  event: TraceEventType;

  /** Wall-clock timestamp (ISO-8601). */
  timestamp: string;

  /** Outcome (success / failure / pending). */
  outcome: "success" | "failure" | "pending";

  /** Optional structured payload (must not contain NEVER_LOG_FIELDS). */
  payload?: Record<string, unknown>;

  /** Duration of the operation in milliseconds. */
  durationMs?: number;

  /** Evidence artifact ids produced during this event. */
  evidenceIds?: string[];
}

export type ApprovalStatus = "pending" | "approved" | "denied" | "awaiting_second" | "escalated";

export type AuditEventKind = "preflight" | "approval" | "execution" | "receipt";

export type AuditEventStatus = "success" | "warning" | "error" | "info";

export interface AuditEvent {
  id: string;
  kind: AuditEventKind;
  actor: string;
  message: string;
  at: string;
  status?: AuditEventStatus;
  metadata?: Record<string, string | number | boolean>;
}

export interface ApprovalRecord {
  id: string;
  requester: string;
  approver?: string | null;
  action: string;
  status: ApprovalStatus;
  reason?: string | null;
  decisionReason?: string | null;
  runId?: string | null;
  createdAt: string;
  approvalsRequired: number;
  approvalsCompleted: number;
  requiresDualControl: boolean;
  claims: string[];
  auditTrail?: AuditEvent[];
}

export interface AbacState {
  claims: string[];
  loading: boolean;
  allowed: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

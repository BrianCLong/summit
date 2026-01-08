export type ApprovalStatus = "pending" | "waiting_dual" | "approved" | "denied";

export type Decision = "approve" | "deny";

export type UserContext = {
  id: string;
  name: string;
  role: "compliance_officer" | "risk_owner" | "auditor";
  clearance: "l1" | "l2" | "l3";
  region: "us" | "eu";
  tenants: string[];
};

export type ApprovalAction = {
  id: string;
  actor: string;
  role: UserContext["role"];
  decision: "approved" | "denied";
  rationale: string;
  timestamp: string;
  correlationId: string;
};

export type DecisionAction = ApprovalAction & { statusOverride?: ApprovalStatus };

export type AuditEventType = "request" | "abac" | "approval" | "denial" | "external" | "status";

export type AuditEvent = {
  id: string;
  correlationId: string;
  type: AuditEventType;
  title: string;
  description: string;
  actor?: string;
  timestamp: string;
  tags?: string[];
};

export type ApprovalRequest = {
  id: string;
  title: string;
  service: string;
  requester: string;
  riskLevel: "low" | "medium" | "high";
  status: ApprovalStatus;
  dualControl: boolean;
  correlationId: string;
  submittedAt: string;
  attributes: {
    tenant: string;
    region: "us" | "eu";
    sensitivity: "internal" | "restricted";
  };
  approvals: ApprovalAction[];
  timeline: AuditEvent[];
};

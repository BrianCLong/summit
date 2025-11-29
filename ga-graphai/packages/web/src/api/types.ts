export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface ApprovalTarget {
  userId: string;
  tenantId: string;
  role?: string;
}

export interface Approval {
  id: string;
  operation: "grant_elevated_access" | string;
  requesterId: string;
  approverId?: string | null;
  target: ApprovalTarget;
  attributes: Record<string, any>;
  status: ApprovalStatus;
  rationale?: string | null;
  receiptId?: string | null;
  createdAt: string;
  decidedAt?: string | null;
}

export interface PolicySimulationResult {
  allow: boolean;
  requiresApproval: boolean;
  reasons: string[];
}

export interface Receipt {
  id: string;
  operation: string;
  approvalId: string;
  outcome: string;
  evidenceHash: string;
  evidenceLocation: string;
  createdAt: string;
}

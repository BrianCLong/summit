export interface Template {
  id: string;
  name: string;
  description: string;
  scopes: string[];
  ttl: number;
}

export interface Grant {
  issuedAt: string;
  expiresAt: string;
  revokedAt?: string;
  active: boolean;
}

export interface ApprovalRecord {
  approverId: string;
  approvedAt: string;
  comment?: string;
}

export type RequestStatus = 'PENDING' | 'APPROVED' | 'EXPIRED' | 'REVOKED';

export interface AccessRequest {
  id: string;
  templateId: string;
  template: Template;
  requestorId: string;
  purpose: string;
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
  approvals: ApprovalRecord[];
  grant?: Grant;
}

export interface AuditEvent {
  id: string;
  type: string;
  payload: unknown;
  timestamp: string;
  signature: string;
}

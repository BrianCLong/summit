export type WriteActionType = 'DRAFT' | 'PROPOSE' | 'ANNOTATE';

export type WriteActionStatus =
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXECUTING'
  | 'COMPLETED'
  | 'KILLED'
  | 'ROLLED_BACK'
  | 'FAILED';

export interface WriteCapability {
  version: string;
  allowedActions: WriteActionType[];
  prohibitedActions: string[]; // Explicitly listed prohibited actions like 'DIRECT_MERGE', 'EXECUTE_PROD'
}

export interface WriteBudget {
  maxFiles: number;
  maxLines: number;
  maxSteps: number;
}

export interface WritePayload {
  target: string; // File path, resource ID, etc.
  content?: string;
  metadata?: Record<string, any>;
  diff?: string;
}

export interface WriteAction {
  id: string;
  type: WriteActionType;
  payload: WritePayload;
  status: WriteActionStatus;
  requester: string;
  approver?: string;
  budget?: WriteBudget;
  createdAt: Date;
  updatedAt: Date;
  killSwitchActive?: boolean;
  rollbackData?: any; // To store data needed for rollback
}

export interface WriteEnvelope {
  capabilityVersion: string;
  action: WriteAction;
  signature?: string; // For integrity
}

export interface ApprovalRequest {
  actionId: string;
  approver: string; // The required approver (user ID or role)
  scope: string; // Description of what is being approved
  expiration: Date;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  requestedAt: Date;
  respondedAt?: Date;
}
